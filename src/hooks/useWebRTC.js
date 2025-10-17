import { useState, useEffect, useCallback, useRef } from 'react';
import WebRTCService from '../services/webrtcService';

const useWebRTC = (roomId, userId, userName) => {
  // State for managing video streams and UI
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);

  // Ref to store WebRTC service instance
  const webrtcServiceRef = useRef(null);

  // Initialize WebRTC service
  useEffect(() => {
    if (!roomId || !userId) return;

    const initializeWebRTC = async () => {
      try {
        setConnectionStatus('connecting');
        
        // Create WebRTC service instance
        const service = new WebRTCService(
          import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'
        );
        
        webrtcServiceRef.current = service;

        // Set up event listeners
        service.on('user-joined', (data) => {
          console.log('User joined:', data);
          setParticipants(prev => [...prev, data]);
        });

        service.on('user-left', (data) => {
          console.log('User left:', data);
          setParticipants(prev => prev.filter(p => p.userId !== data.userId));
          // Remove their stream
          setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.delete(data.userId);
            return newStreams;
          });
        });

        service.on('receive-message', (message) => {
          setMessages(prev => [...prev, message]);
        });

        service.on('stream-added', ({ userId, stream }) => {
          console.log('Stream added for user:', userId);
          setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.set(userId, stream);
            return newStreams;
          });
        });

        service.on('stream-removed', ({ userId }) => {
          console.log('Stream removed for user:', userId);
          setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.delete(userId);
            return newStreams;
          });
        });

        service.on('error', (error) => {
          console.error('WebRTC error:', error);
          setError(error.message || 'Connection error occurred');
          setConnectionStatus('error');
        });

        // Connect to server
        await service.connect();
        
        // Get user media (camera and microphone)
        const stream = await service.getUserMedia({
          video: true,
          audio: true
        });
        
        setLocalStream(stream);
        
        // Join the room
        await service.joinRoom(roomId, {
          userId,
          userName: userName || `User_${userId}`
        });
        
        setConnectionStatus('connected');
      } catch (err) {
        console.error('Failed to initialize WebRTC:', err);
        setError(err.message || 'Failed to initialize video call');
        setConnectionStatus('error');
      }
    };

    initializeWebRTC();

    // Cleanup function
    return () => {
      if (webrtcServiceRef.current) {
        // Corrected line: Call leaveRoom() and disconnect()
        webrtcServiceRef.current.leaveRoom();
        webrtcServiceRef.current.disconnect();
        webrtcServiceRef.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // <-- Add the empty dependency array here

  // Toggle camera on/off
  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
      
      // Notify other participants
      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.socket.emit('toggle-video', {
          roomId,
          enabled: videoTrack.enabled
        });
      }
    }
  }, [localStream, roomId]);

  // Toggle microphone on/off
  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
      
      // Notify other participants
      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.socket.emit('toggle-audio', {
          roomId,
          enabled: audioTrack.enabled
        });
      }
    }
  }, [localStream, roomId]);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    if (!webrtcServiceRef.current || isScreenSharing) return;
    
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      
      // Replace video track in peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      
      // Replace track for all peer connections
      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.replaceVideoTrack(videoTrack);
      }
      
      // When user stops sharing
      videoTrack.onended = () => {
        stopScreenShare();
      };
      
      setIsScreenSharing(true);
      
      // Notify other participants
      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.socket.emit('screen-share-started', { roomId });
      }
    } catch (err) {
      console.error('Failed to start screen share:', err);
      setError('Failed to start screen sharing');
    }
  }, [isScreenSharing, roomId]);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (!webrtcServiceRef.current || !isScreenSharing) return;
    
    // Restore original video track
    const videoTrack = localStream?.getVideoTracks()[0];
    if (videoTrack && webrtcServiceRef.current) {
      webrtcServiceRef.current.replaceVideoTrack(videoTrack);
    }
    
    setIsScreenSharing(false);
    
    // Notify other participants
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.socket.emit('screen-share-stopped', { roomId });
    }
  }, [isScreenSharing, localStream, roomId]);

  // Send chat message
  const sendMessage = useCallback((text) => {
    if (!webrtcServiceRef.current || !text.trim()) return;
    
    const message = {
      id: Date.now().toString(),
      userId,
      userName: userName || `User_${userId}`,
      text: text.trim(),
      timestamp: new Date().toISOString()
    };
    
    // Add to local messages
    setMessages(prev => [...prev, message]);
    
    // Send to other participants
    webrtcServiceRef.current.socket.emit('chat-message', {
      roomId,
      message
    });
  }, [roomId, userId, userName]);

  // Leave the meeting
  const leaveMeeting = useCallback(() => {
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.leaveRoom();
      webrtcServiceRef.current.disconnect();
    }
    
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Clear state
    setLocalStream(null);
    setRemoteStreams(new Map());
    setParticipants([]);
    setMessages([]);
    setConnectionStatus('disconnected');
  }, [localStream]);

  // Get participant count
  const participantCount = participants.length + 1; // +1 for self

  return {
    // Streams
    localStream,
    remoteStreams,
    
    // Controls state
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    
    // Meeting data
    participants,
    participantCount,
    messages,
    
    // Connection info
    connectionStatus,
    error,
    
    // Actions
    toggleCamera,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    leaveMeeting
  };
};

export default useWebRTC;