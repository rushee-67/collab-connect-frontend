// src/hooks/useWebRTC.js
import { useState, useEffect, useCallback, useRef } from "react";
import WebRTCService from "../services/webrtcService";

const useWebRTC = (roomId, userId, userName, isHost = false) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [error, setError] = useState(null);
  const [isMeetingEnded, setIsMeetingEnded] = useState(false);

  const webrtcServiceRef = useRef(null);

  useEffect(() => {
    if (!roomId || !userId || webrtcServiceRef.current) return;

    const initializeWebRTC = async () => {
      try {
        setConnectionStatus("connecting");
        const service = new WebRTCService(import.meta.env.VITE_SERVER_URL || "http://localhost:5000");
        webrtcServiceRef.current = service;

        // participants
        service.on("user-joined", (data) => setParticipants((prev) => [...prev, data]));
        service.on("user-left", (data) => {
          setParticipants((prev) => prev.filter((p) => p.userId !== data.userId));
          setRemoteStreams((prev) => {
            const newMap = new Map(prev);
            newMap.delete(data.userId);
            return newMap;
          });
        });

        // messages — webrtcService emits 'receive-message' when socket receives a chat-message
        service.on("receive-message", (msg) => {
          const normalizedMsg = {
            id: msg.id || Date.now().toString(),
            sender: msg.sender || msg.userName || "Unknown",
            message: msg.message || msg.text || "",
            timestamp: msg.timestamp || new Date().toISOString(),
          };
          setMessages((prev) => [...prev, normalizedMsg]);
        });

        // meeting ended (host triggered)
        service.on("meeting-ended", () => {
          console.log("Meeting ended by host (received).");
          setIsMeetingEnded(true);

          // cleanup
          if (webrtcServiceRef.current) {
            webrtcServiceRef.current.leaveRoom();
            webrtcServiceRef.current.disconnect();
            webrtcServiceRef.current = null;
          }
          if (localStream) {
            localStream.getTracks().forEach((t) => t.stop());
          }
          setLocalStream(null);
          setRemoteStreams(new Map());
          setParticipants([]);
          setMessages([]);
          setConnectionStatus("disconnected");

          alert("Meeting was ended by the host.");
          window.location.href = "/dashboard/home";
        });

        // not-authorized feedback
        service.on("not-authorized", (msg) => {
          alert(msg.message || "Only host can end the meeting.");
        });

        // stream added by peers
        service.on("stream-added", ({ userId: remoteId, stream }) => {
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
        setConnectionStatus("connected");
      } catch (err) {
        console.error("WebRTC init error:", err);
        setError(err.message || "Initialization failed");
        setConnectionStatus("error");
      }
    };

    initializeWebRTC();

    return () => {
      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.leaveRoom();
        webrtcServiceRef.current.disconnect();
        webrtcServiceRef.current = null;
      }
      if (localStream) localStream.getTracks().forEach((t) => t.stop());
    };
  }, [roomId, userId, userName]);

  // toggle audio
  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsAudioEnabled(track.enabled);
    }
  }, [localStream]);

  // toggle camera
  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsVideoEnabled(track.enabled);
    }
  }, [localStream]);

  // send chat message
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

      // add locally
      // send message only via server, avoid local duplication
      webrtcServiceRef.current.socket.emit('chat-message', { roomId, message });
    },
    [roomId, userId, userName]
  );

  // start screen share
  const startScreenShare = useCallback(async () => {
    if (!webrtcServiceRef.current || isScreenSharing) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const newTrack = screenStream.getVideoTracks()[0];
      webrtcServiceRef.current.replaceVideoTrack(newTrack);
      setIsScreenSharing(true);
      newTrack.onended = () => stopScreenShare();
      // notify others via socket (webrtcService handles emitting)
      webrtcServiceRef.current.socket.emit("screen-share-start", roomId);
    } catch (err) {
      console.error("Screen share error:", err);
      setError("Screen sharing failed.");
    }
  }, [isScreenSharing, roomId]);

  // stop screen share
  const stopScreenShare = useCallback(() => {
    if (!webrtcServiceRef.current || !isScreenSharing) return;
    const camTrack = localStream?.getVideoTracks()[0];
    if (camTrack) webrtcServiceRef.current.replaceVideoTrack(camTrack);
    setIsScreenSharing(false);
    try {
      webrtcServiceRef.current.socket.emit("screen-share-stop", roomId);
    } catch (e) {}
  }, [isScreenSharing, localStream, roomId]);

  // leave meeting: if host -> end meeting for all, else just disconnect
  const leaveMeeting = useCallback(
    (onLeaveRedirect) => {
      try {
        if (webrtcServiceRef.current) {
          if (isHost) {
            // Host ends meeting for everyone
            webrtcServiceRef.current.socket.emit("meeting-ended", { roomId, isHost: true });
          } else {
            // Participant leaves — inform server optionally
            try {
              webrtcServiceRef.current.socket.emit("leave-room", { roomId, userId });
            } catch (e) {}
          }

          webrtcServiceRef.current.leaveRoom();
          webrtcServiceRef.current.disconnect();
          webrtcServiceRef.current = null;
        }

        if (localStream) localStream.getTracks().forEach((t) => t.stop());
      } catch (err) {
        console.error("Error during leave:", err);
      } finally {
        setLocalStream(null);
        setRemoteStreams(new Map());
        setParticipants([]);
        setMessages([]);
        setConnectionStatus("disconnected");
        if (onLeaveRedirect) onLeaveRedirect();
      }
    },
    [localStream, isHost, roomId, userId]
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
    startScreenShare,
    stopScreenShare,
    isMeetingEnded,
  };
};

export default useWebRTC;
