// src/hooks/useWebRTC.js
import { useState, useEffect, useCallback, useRef } from 'react';
import WebRTCService from '../services/webrtcService';

const useWebRTC = (roomId, userId, userName, isHost = false) => {
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
    if (!roomId || !userId || webrtcServiceRef.current) return;

    console.log('🧠 Initializing WebRTC only once for', userId);

    const initializeWebRTC = async () => {
      try {
        setConnectionStatus('connecting');
        const service = new WebRTCService(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000');
        webrtcServiceRef.current = service;

        // Participants join/leave
        service.on('user-joined', (data) => setParticipants((prev) => [...prev, data]));
        service.on('user-left', (data) => {
          setParticipants((prev) => prev.filter((p) => p.userId !== data.userId));
          setRemoteStreams((prev) => {
            const newMap = new Map(prev);
            newMap.delete(data.userId);
            return newMap;
          });
        });

        // Messages
        service.on('receive-message', (msg) => {
          const normalizedMsg = {
            id: msg.id || Date.now().toString(),
            sender: msg.sender || msg.userName || 'Unknown',
            message: msg.message || msg.text || '',
            timestamp: msg.timestamp || new Date().toISOString(),
          };
          setMessages((prev) => [...prev, normalizedMsg]);
        });

        // Meeting ended (by host)
        service.on('meeting-ended', () => {
          setIsMeetingEnded(true);
          if (webrtcServiceRef.current) {
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
        });

        // Unauthorized attempt
        service.on('not-authorized', (msg) => {
          alert(msg.message || 'Only the host can end the meeting.');
        });

        // Remote streams
        service.on('stream-added', ({ userId: remoteId, stream }) => {
          setRemoteStreams((prev) => {
            const newMap = new Map(prev);
            newMap.set(remoteId, stream);
            return newMap;
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
      webrtcServiceRef.current?.socket?.emit('toggle-audio', { roomId, userId, enabled: track.enabled });
    }
  }, [localStream, roomId, userId]);

  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsVideoEnabled(track.enabled);
      webrtcServiceRef.current?.socket?.emit('toggle-video', { roomId, userId, enabled: track.enabled });
    }
  }, [localStream, roomId, userId]);

  // ✅ Leave or End Meeting (Host-Only)
  const leaveMeeting = useCallback(
    (onLeaveRedirect) => {
      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.socket.emit('meeting-ended', { roomId, isHost });
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
    [localStream, roomId, isHost]
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
      setMessages((prev) => [
        ...prev,
        {
          id: message.id,
          sender: message.userName,
          message: message.text,
          timestamp: message.timestamp,
        },
      ]);
      webrtcServiceRef.current.socket.emit('chat-message', { roomId, message });
    },
    [roomId, userId, userName]
  );

  const startScreenShare = useCallback(async () => {
    if (!webrtcServiceRef.current || isScreenSharing) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const newTrack = screenStream.getVideoTracks()[0];
      webrtcServiceRef.current.replaceVideoTrack(newTrack);
      setIsScreenSharing(true);
      newTrack.onended = () => stopScreenShare();
      webrtcServiceRef.current.socket.emit('screen-share-started', roomId);
    } catch (err) {
      console.error('Failed to start screen share:', err);
      setError('Screen sharing not supported or denied');
    }
  }, [isScreenSharing, roomId]);

  const stopScreenShare = useCallback(() => {
    if (!webrtcServiceRef.current || !isScreenSharing) return;
    const cameraTrack = localStream?.getVideoTracks()[0];
    if (cameraTrack) webrtcServiceRef.current.replaceVideoTrack(cameraTrack);
    setIsScreenSharing(false);
    webrtcServiceRef.current.socket.emit('screen-share-stopped', roomId);
  }, [isScreenSharing, localStream, roomId]);

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
    startScreenShare,
    stopScreenShare,
    isMeetingEnded,
  };
};

export default useWebRTC;
