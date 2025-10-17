// src/pages/MeetingRoom.jsx
import React, { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy } from 'lucide-react';
import useWebRTC from '../hooks/useWebRTC';
import VideoPlayer from '../components/VideoPlayer';

const MeetingRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const userId = 'user-' + Math.random().toString(36).substr(2, 9);
  const userName = 'Guest-' + userId.substr(5);

  const {
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    participants,
    messages,
    connectionStatus,
    error,
    toggleAudio,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    leaveMeeting
  } = useWebRTC(roomId, userId, userName);

  const [chatInput, setChatInput] = useState('');
  const localVideoRef = useRef(null);

  // Play local stream
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Debug: Log remote streams
  useEffect(() => {
    console.log('Remote streams updated:', remoteStreams);
    console.log('Remote streams size:', remoteStreams.size);
    console.log('Remote streams entries:', Array.from(remoteStreams.entries()));
  }, [remoteStreams]);

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      sendMessage(chatInput);
      setChatInput('');
    }
  };

  const copyMeetingLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    alert('Meeting link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Collab Connect</h1>
        <div className="flex gap-4 items-center">
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
            Profile
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Video Grid - Left Side */}
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
            <button
              onClick={copyMeetingLink}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            >
              <Copy size={16} />
              Copy Link
            </button>
            <button
              onClick={leaveMeeting}
              className="px-6 py-2 bg-red-600 rounded hover:bg-red-700"
            >
              Leave Meeting
            </button>
          </div>

          {/* Video Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Local Video */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded">
                You ({userName})
              </div>
            </div>

            {/* Remote Videos */}
            {Array.from(remoteStreams.entries()).map(([participantId, stream]) => (
              <div key={participantId} className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                <VideoPlayer
                  stream={stream}
                  participantId={participantId}
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded">
                  {participants.find(p => p.userId === participantId)?.userName || participantId}
                </div>
              </div>
            ))}
          </div>

          {/* Connection Status */}
          {connectionStatus !== 'connected' && (
            <div className="mt-4 p-4 bg-yellow-800 rounded">
              Connection Status: {connectionStatus}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-800 rounded">
              Error: {error}
            </div>
          )}
        </div>

        {/* Chat - Right Side */}
        <div className="w-96 bg-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold">Chat</h2>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((msg, index) => (
              <div key={index} className="bg-gray-700 p-2 rounded">
                <div className="font-semibold text-sm">{msg.sender}</div>
                <div>{msg.message}</div>
                <div className="text-xs text-gray-400">{new Date(msg.timestamp).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Controls - Bottom */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
        <button
          onClick={toggleAudio}
          className={`px-6 py-3 rounded-lg font-semibold ${
            isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isAudioEnabled ? 'Mute Mic' : 'Unmute Mic'}
        </button>
        <button
          onClick={toggleCamera}
          className={`px-6 py-3 rounded-lg font-semibold ${
            isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isVideoEnabled ? 'Turn Off Cam' : 'Turn On Cam'}
        </button>
        <button
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          className="px-6 py-3 bg-blue-600 rounded-lg font-semibold hover:bg-blue-700"
        >
          {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
        </button>
      </div>
    </div>
  );
};

export default MeetingRoom;
