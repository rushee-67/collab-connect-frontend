// src/pages/MeetingRoom.jsx
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy } from 'lucide-react';
import useWebRTC from '../hooks/useWebRTC';
import VideoPlayer from '../components/VideoPlayer';

const MeetingRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const userName = decodeURIComponent(params.get('name') || localStorage.getItem('cc_user_name') || 'Guest');
  const isHost = params.get('host') === 'true';
  const userId = useMemo(() => 'user-' + Math.random().toString(36).substr(2, 9), []);

  const {
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
    startScreenShare,
    stopScreenShare,
    sendMessage,
    leaveMeeting
  } = useWebRTC(roomId, userId, userName, isHost);

  const [chatInput, setChatInput] = useState('');
  const localVideoRef = useRef(null);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      sendMessage(chatInput);
      setChatInput('');
    }
  };

  const copyMeetingLink = () => {
    const link = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(link);
    alert('Meeting link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Collab Connect</h1>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        <div className="flex-1 p-4">
          <div className="mb-4 flex justify-between items-center bg-gray-800 p-4 rounded">
            <div>
              <span className="text-sm">Room ID: </span>
              <span className="font-mono text-blue-400">{roomId}</span>
            </div>
            <div>
              <span className="text-sm">Participants: </span>
              <span className="font-bold">{participants.length + 1}</span>
            </div>
            <button onClick={copyMeetingLink} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
              <Copy size={16} /> Copy Link
            </button>
            {isHost ? (
              <button onClick={() => leaveMeeting(() => navigate('/dashboard/home'))} className="px-6 py-2 bg-red-600 rounded hover:bg-red-700">
                End Meeting for All
              </button>
            ) : (
              <button onClick={() => navigate('/dashboard/home')} className="px-6 py-2 bg-red-600 rounded hover:bg-red-700">
                Leave Meeting
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded">
                You ({userName})
              </div>
            </div>

            {Array.from(remoteStreams.entries()).map(([id, stream]) => (
              <div key={id} className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                <VideoPlayer stream={stream} participantId={id} />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded">
                  {participants.find((p) => p.userId === id)?.userName || id}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingRoom;
