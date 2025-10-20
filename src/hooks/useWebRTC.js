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

        // Event Listeners
        service.on('user-joined', (data) => setParticipants(prev => [...prev, data]));
        service.on('user-left', (data) => {
          setParticipants(prev => prev.filter(p => p.userId !== data.userId));
          setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.delete(data.userId);
            return newStreams;
          });
        });

        // ✅ Chat fix
        service.on('receive-message', (msg) => {
          setMessages(prev => [...prev, msg]);
          const normalizedMsg = {
            id: msg.id || Date.now().toString(),
            sender: msg.userName || msg.sender || 'Unknown',
            message: msg.text || msg.message || '',
            timestamp: msg.timestamp || new Date().toISOString(),
          };
          setMessages(prev => [...prev, normalizedMsg]);
        });


        // ✅ Meeting end broadcast
        service.on('meeting-ended', () => {
          alert('Meeting ended by host.');
          leaveMeeting(() => navigate('/'));
        });

        // Stream handlers
        service.on('stream-added', ({ userId, stream }) => {
          setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.set(userId, stream);
            return newStreams;
          });
        });

        // Connect + Join Room
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
  }, []);

  // ✅ Toggle mic/video works fine
  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
      webrtcServiceRef.current?.socket.emit('toggle-audio', { roomId, enabled: audioTrack.enabled });
    }
  }, [localStream, roomId]);

  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
      webrtcServiceRef.current?.socket.emit('toggle-video', { roomId, enabled: videoTrack.enabled });
    }
  }, [localStream, roomId]);

  // ✅ Leave meeting broadcast
  // Leave the meeting (with optional redirect callback)
const leaveMeeting = useCallback(
  (onLeaveRedirect) => {
    if (webrtcServiceRef.current) {
      // Notify everyone that the meeting ended
      webrtcServiceRef.current.socket.emit('meeting-ended', { roomId });

      // Leave the WebRTC room and disconnect
      webrtcServiceRef.current.leaveRoom();
      webrtcServiceRef.current.disconnect();
    }

    // Stop all local media tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    // Reset state
    setLocalStream(null);
    setRemoteStreams(new Map());
    setParticipants([]);
    setMessages([]);
    setConnectionStatus('disconnected');

    // ✅ Use callback to navigate (no reload)
    if (onLeaveRedirect) {
      onLeaveRedirect(); // this will call navigate('/') in MeetingRoom
    }
  },
  [localStream, roomId]
);


  // ✅ Send message fix
  const sendMessage = useCallback((text) => {
  if (!webrtcServiceRef.current || !text.trim()) return;

  const message = {
    id: Date.now().toString(),
    userId,
    userName,
    text: text.trim(),
    sender: userName,
    message: text.trim(),
    timestamp: new Date().toISOString(),
    roomId,
  };

  setMessages(prev => [...prev, message]);
  webrtcServiceRef.current.socket.emit('chat-message', { roomId, message });
  }, [roomId, userId, userName]);


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
    leaveMeeting
  };
};

export default useWebRTC;
