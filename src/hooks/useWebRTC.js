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

    console.log("🧠 Initializing WebRTC only once for", userId);

    const initializeWebRTC = async () => {
      try {
        setConnectionStatus("connecting");
        const service = new WebRTCService(
          import.meta.env.VITE_SERVER_URL || "http://localhost:5000"
        );
        webrtcServiceRef.current = service;

        // Participants joining
        service.on("user-joined", (data) => {
          setParticipants((prev) => [...prev, data]);
        });

        // Participants leaving
        service.on("user-left", (data) => {
          setParticipants((prev) =>
            prev.filter((p) => p.userId !== data.userId)
          );
          setRemoteStreams((prev) => {
            const newMap = new Map(prev);
            newMap.delete(data.userId);
            return newMap;
          });
        });

        // Chat message received
        service.on("receive-message", (msg) => {
          const normalizedMsg = {
            id: msg.id || Date.now().toString(),
            sender: msg.sender || msg.userName || "Unknown",
            message: msg.message || msg.text || "",
            timestamp: msg.timestamp || new Date().toISOString(),
          };
          setMessages((prev) => [...prev, normalizedMsg]);
        });

        // Host ends meeting
        service.on("meeting-ended", () => {
          console.log("📢 Meeting ended event received");
          setIsMeetingEnded(true);
          if (webrtcServiceRef.current) {
            webrtcServiceRef.current.leaveRoom();
            webrtcServiceRef.current.disconnect();
            webrtcServiceRef.current = null;
          }
          if (localStream)
            localStream.getTracks().forEach((track) => track.stop());
          setLocalStream(null);
          setRemoteStreams(new Map());
          setParticipants([]);
          setMessages([]);
          setConnectionStatus("disconnected");
          alert("Meeting has ended by the host.");
          window.location.href = "/dashboard/home";
        });

        // Unauthorized end meeting attempt
        service.on("not-authorized", (msg) => {
          alert(msg.message || "Only host can end the meeting.");
        });

        // New remote stream added
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
  }, [roomId, userId]);

  // Toggle Audio
  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsAudioEnabled(track.enabled);
    }
  }, [localStream]);

  // Toggle Camera
  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    const track = localStream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsVideoEnabled(track.enabled);
    }
  }, [localStream]);

  // Send Chat Message
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
      webrtcServiceRef.current.socket.emit("chat-message", {
        roomId,
        message,
      });
    },
    [roomId, userId, userName]
  );

  // ✅ Host Ends or Participant Leaves
  const leaveMeeting = useCallback(
    (onLeaveRedirect) => {
      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.socket.emit("meeting-ended", {
          roomId,
          isHost,
        });
        webrtcServiceRef.current.leaveRoom();
        webrtcServiceRef.current.disconnect();
        webrtcServiceRef.current = null;
      }
      if (localStream)
        localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
      setRemoteStreams(new Map());
      setParticipants([]);
      setMessages([]);
      setConnectionStatus("disconnected");

      if (onLeaveRedirect) onLeaveRedirect();
    },
    [localStream, roomId, isHost]
  );

  // Screen Share Start/Stop
  const startScreenShare = useCallback(async () => {
    if (!webrtcServiceRef.current || isScreenSharing) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const newTrack = screenStream.getVideoTracks()[0];
      webrtcServiceRef.current.replaceVideoTrack(newTrack);
      setIsScreenSharing(true);
      newTrack.onended = () => stopScreenShare();
    } catch (err) {
      console.error("Screen share error:", err);
      setError("Screen sharing failed.");
    }
  }, [isScreenSharing]);

  const stopScreenShare = useCallback(() => {
    if (!webrtcServiceRef.current || !isScreenSharing) return;
    const camTrack = localStream?.getVideoTracks()[0];
    if (camTrack) webrtcServiceRef.current.replaceVideoTrack(camTrack);
    setIsScreenSharing(false);
  }, [isScreenSharing, localStream]);

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
