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
  const [isMeetingEnded, setIsMeetingEnded] = useState(false);

  const webrtcServiceRef = useRef(null);

  useEffect(() => {
    if (!roomId || !userId || webrtcServiceRef.current) return; // ✅ run once

    console.log('🧠 Initializing WebRTC only once for', userId);

    const initializeWebRTC = async () => {
      try {
        setConnectionStatus('connecting');
        const service = new WebRTCService(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000');
        webrtcServiceRef.current = service;

        service.on('user-joined', (data) => setParticipants((prev) => [...prev, data]));
        service.on('user-left', (data) => {
          setParticipants((prev) => prev.filter((p) => p.userId !== data.userId));
          setRemoteStreams((prev) => {
            const newStreams = new Map(prev);
            newStreams.delete(data.userId);
            return newStreams;
          });
        });

        service.on('receive-message', (msg) => {
          const normalizedMsg = {
            id: msg.id || Date.now().toString(),
            sender: msg.sender || msg.userName || 'Unknown',
            message: msg.message || msg.text || '',
            timestamp: msg.timestamp || new Date().toISOString(),
          };
          setMessages((prev) => [...prev, normalizedMsg]);
        });

        service.on('meeting-ended', () => {
          setIsMeetingEnded(true);
          if (webrtcServiceRef.current) {
            webrtcServiceRef.current.leaveRoom();
            webrtcServiceRef.current.disconnect();
          }
          if (localStream) localStream.getTracks().forEach((track) => track.stop());
          setLocalStream(null);
          setRemoteStreams(new Map());
          setParticipants([]);
          setMessages([]);
          setConnectionStatus('disconnected');
        });

        service.on('stream-added', ({ userId, stream }) => {
          setRemoteStreams((prev) => {
            const newStreams = new Map(prev);
            newStreams.set(userId, stream);
            return newStreams;
          });
        });

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
        webrtcServiceRef.current = null;
      }
      if (localStream) localStream.getTracks().forEach((track) => track.stop());
    };
  }, [roomId, userId]);

  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsAudioEnabled(track.enabled);
    }
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsVideoEnabled(track.enabled);
    }
  }, [localStream]);

  const leaveMeeting = useCallback(
    (onLeaveRedirect) => {
      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.socket.emit('meeting-ended', { roomId });
        webrtcServiceRef.current.leaveRoom();
        webrtcServiceRef.current.disconnect();
        webrtcServiceRef.current = null;
      }
      if (localStream) localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
      setRemoteStreams(new Map());
      setParticipants([]);
      setMessages([]);
      setConnectionStatus('disconnected');
      if (onLeaveRedirect) onLeaveRedirect();
    },
    [localStream, roomId]
  );

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
      setMessages((prev) => [...prev, {
        id: message.id,
        sender: message.userName,
        message: message.text,
        timestamp: message.timestamp,
      }]);
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
    isMeetingEnded,
  };
};

export default useWebRTC;
