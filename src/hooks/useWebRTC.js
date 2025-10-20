// src/hooks/useWebRTC.js
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
    if (!roomId || !userId || webrtcServiceRef.current) return;

    console.log('🧠 Initializing WebRTC only once for', userId);

    const initializeWebRTC = async () => {
      try {
        setConnectionStatus('connecting');
        // use env var; ensure VITE_SERVER_URL is set for Netlify -> Render
        const service = new WebRTCService(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000');
        webrtcServiceRef.current = service;

        // participants
        service.on('user-joined', (data) => setParticipants(prev => [...prev, data]));
        service.on('user-left', (data) => {
          setParticipants(prev => prev.filter(p => p.userId !== data.userId));
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(data.userId);
            return newMap;
          });
        });

        // messages (backend sends normalized object)
        service.on('receive-message', (msg) => {
          const normalizedMsg = {
            id: msg.id || Date.now().toString(),
            sender: msg.sender || msg.userName || 'Unknown',
            message: msg.message || msg.text || '',
            timestamp: msg.timestamp || new Date().toISOString(),
          };
          setMessages(prev => [...prev, normalizedMsg]);
        });

        // meeting ended
        service.on('meeting-ended', () => {
          setIsMeetingEnded(true);

          if (webrtcServiceRef.current) {
            webrtcServiceRef.current.leaveRoom();
            webrtcServiceRef.current.disconnect();
            webrtcServiceRef.current = null;
          }
          if (localStream) localStream.getTracks().forEach(track => track.stop());
          setLocalStream(null);
          setRemoteStreams(new Map());
          setParticipants([]);
          setMessages([]);
          setConnectionStatus('disconnected');

          // redirect handled by UI/modal or window.location
        });

        // remote stream added
        service.on('stream-added', ({ userId: remoteId, stream }) => {
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.set(remoteId, stream);
            return newMap;
          });
        });

        await service.connect();

        // get local audio+video
        const stream = await service.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);

        // join
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
      if (localStream) localStream.getTracks().forEach(track => track.stop());
    };
  }, [roomId, userId]);

  // toggle audio
  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsAudioEnabled(track.enabled);
      // optional: broadcast audio toggle
      webrtcServiceRef.current?.socket?.emit('toggle-audio', { roomId, userId, enabled: track.enabled });
    }
  }, [localStream, roomId, userId]);

  // toggle camera
  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsVideoEnabled(track.enabled);
      webrtcServiceRef.current?.socket?.emit('toggle-video', { roomId, userId, enabled: track.enabled });
    }
  }, [localStream, roomId, userId]);

  // leave meeting
  const leaveMeeting = useCallback((onLeaveRedirect) => {
    if (webrtcServiceRef.current) {
      try {
        webrtcServiceRef.current.socket.emit('meeting-ended', { roomId });
      } catch (e) {}
      webrtcServiceRef.current.leaveRoom();
      webrtcServiceRef.current.disconnect();
      webrtcServiceRef.current = null;
    }
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    setLocalStream(null);
    setRemoteStreams(new Map());
    setParticipants([]);
    setMessages([]);
    setConnectionStatus('disconnected');
    if (onLeaveRedirect) onLeaveRedirect();
  }, [localStream, roomId]);

  // send message
  const sendMessage = useCallback((text) => {
    if (!webrtcServiceRef.current || !text.trim()) return;
    const message = {
      id: Date.now().toString(),
      userId,
      userName,
      text: text.trim(),
      timestamp: new Date().toISOString(),
      roomId,
    };

    // add locally in normalized form
    setMessages(prev => [...prev, {
      id: message.id,
      sender: message.userName,
      message: message.text,
      timestamp: message.timestamp,
    }]);

    // emit to others (backend will broadcast to others only)
    webrtcServiceRef.current.socket.emit('chat-message', { roomId, message });
  }, [roomId, userId, userName]);

  // START screen share
  const startScreenShare = useCallback(async () => {
    if (!webrtcServiceRef.current || isScreenSharing) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const newTrack = screenStream.getVideoTracks()[0];
      // replace track in peers
      webrtcServiceRef.current.replaceVideoTrack(newTrack);
      setIsScreenSharing(true);

      // when screen share stops (user presses stop in browser)
      newTrack.onended = () => {
        // restore original camera track
        stopScreenShare();
      };

      // notify others
      webrtcServiceRef.current.socket.emit('screen-share-started', roomId);
    } catch (err) {
      console.error('Failed to start screen share:', err);
      setError('Screen sharing not supported or denied');
    }
  }, [isScreenSharing, roomId]);

  // STOP screen share
  const stopScreenShare = useCallback(() => {
    if (!webrtcServiceRef.current || !isScreenSharing) return;
    // restore local camera track if available
    const cameraTrack = localStream?.getVideoTracks()[0];
    if (cameraTrack) {
      webrtcServiceRef.current.replaceVideoTrack(cameraTrack);
    }
    setIsScreenSharing(false);
    try {
      webrtcServiceRef.current.socket.emit('screen-share-stopped', roomId);
    } catch (e) {}
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
