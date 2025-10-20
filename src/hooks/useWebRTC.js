import { useState, useEffect, useCallback, useRef } from 'react';
import WebRTCService from '../services/webrtcService';

const useWebRTC = (roomId, userId, userName) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);

  const webrtcServiceRef = useRef(null);

  useEffect(() => {
    if (!roomId || !userId) return;

    const initializeWebRTC = async () => {
      try {
        setConnectionStatus('connecting');
        const service = new WebRTCService(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000');
        webrtcServiceRef.current = service;

        // ✅ Core WebRTC event listeners
        service.on('user-joined', (data) => setParticipants(prev => [...prev, data]));
        service.on('user-left', (data) => {
          setParticipants(prev => prev.filter(p => p.userId !== data.userId));
          setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.delete(data.userId);
            return newStreams;
          });
        });

        // ✅ Chat fix — normalize message structure
        service.on('receive-message', (msg) => {
          const normalizedMsg = {
            id: msg.id || Date.now().toString(),
            sender: msg.sender || msg.userName || 'Unknown',
            message: msg.message || msg.text || '',
            timestamp: msg.timestamp || new Date().toISOString(),
          };
          setMessages(prev => [...prev, normalizedMsg]);
        });

        // ✅ Handle meeting-ended event from backend
        service.on('meeting-ended', () => {
          alert('The meeting has been ended by the host.');

          // Cleanup WebRTC connections
          if (webrtcServiceRef.current) {
            webrtcServiceRef.current.leaveRoom();
            webrtcServiceRef.current.disconnect();
          }
          if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
          }

          setLocalStream(null);
          setRemoteStreams(new Map());
          setParticipants([]);
          setMessages([]);
          setConnectionStatus('disconnected');

          // Redirect everyone to home
          window.location.href = '/';
        });

        // ✅ Handle new remote streams
        service.on('stream-added', ({ userId, stream }) => {
          setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.set(userId, stream);
            return newStreams;
          });
        });

        // ✅ Start connection
        await service.connect();
        const stream = await service.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        await service.joinRoom(roomId, { userId, userName });
        setConnectionStatus('connected');
      } catch (err) {
        console.error('WebRTC init error:', err);
        setError(err.message || 'Initialization failed');
        setConnectionStatus('error');
      }
    };

    initializeWebRTC();

    return () => {
      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.leaveRoom();
        webrtcServiceRef.current.disconnect();
      }
      if (localStream) localStream.getTracks().forEach(track => track.stop());
    };
  }, [roomId, userId, userName]);

  // ✅ Toggle mic
  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
      webrtcServiceRef.current?.socket.emit('toggle-audio', { roomId, enabled: audioTrack.enabled });
    }
  }, [localStream, roomId]);

  // ✅ Toggle camera
  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
      webrtcServiceRef.current?.socket.emit('toggle-video', { roomId, enabled: videoTrack.enabled });
    }
  }, [localStream, roomId]);

  // ✅ Leave meeting (SPA-safe with callback)
  const leaveMeeting = useCallback(
    (onLeaveRedirect) => {
      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.socket.emit('meeting-ended', { roomId });
        webrtcServiceRef.current.leaveRoom();
        webrtcServiceRef.current.disconnect();
      }

      if (localStream) localStream.getTracks().forEach(track => track.stop());

      setLocalStream(null);
      setRemoteStreams(new Map());
      setParticipants([]);
      setMessages([]);
      setConnectionStatus('disconnected');

      if (onLeaveRedirect) onLeaveRedirect();
    },
    [localStream, roomId]
  );

  // ✅ Send message (with sender info)
  const sendMessage = useCallback(
    (text) => {
      if (!webrtcServiceRef.current || !text.trim()) return;

      const message = {
        id: Date.now().toString(),
        userId,
        userName,
        text: text.trim(),
        timestamp: new Date().toISOString(),
        roomId,
      };

      // Add locally
      setMessages(prev => [...prev, {
        id: message.id,
        sender: message.userName,
        message: message.text,
        timestamp: message.timestamp,
      }]);

      // Emit to others
      webrtcServiceRef.current.socket.emit('chat-message', { roomId, message });
    },
    [roomId, userId, userName]
  );

  return {
    localStream,
    remoteStreams,
    participants,
    messages,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    connectionStatus,
    error,
    toggleAudio,
    toggleCamera,
    sendMessage,
    leaveMeeting,
  };
};

export default useWebRTC;
