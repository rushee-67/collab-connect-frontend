// src/pages/JoinMeeting.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Video, User, ArrowRight, Clock } from "lucide-react";
import AuthForm from "../components/AuthForm.jsx";

export default function JoinMeeting() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const isHost = params.get("host") === "true";

  const [name, setName] = useState(localStorage.getItem("cc_user_name") || "");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [joinBlocked, setJoinBlocked] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState("");

  useEffect(() => {
    const username = localStorage.getItem("username");
    const token = localStorage.getItem("token");
    if (!username || !token) setShowAuthModal(true);

    // check schedule
    fetch(`${import.meta.env.VITE_SERVER_URL || ""}/api/meetings/${roomId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.meeting?.startTime) {
          const start = new Date(data.meeting.startTime);
          const now = new Date();
          if (now < start) {
            setJoinBlocked(true);
            setBlockedMessage(
              `This meeting is scheduled at ${start.toLocaleString()}. Please wait until the start time to join.`
            );
          }
        }
      })
      .catch(() => {});
  }, [roomId]);

  const handleOnLogin = () => setShowAuthModal(false);

  const handleJoin = () => {
    if (joinBlocked) return;
    const token = localStorage.getItem("token");
    if (!token) return setShowAuthModal(true);
    if (!name.trim()) return alert("Enter your name");
    localStorage.setItem("cc_user_name", name.trim());
    navigate(`/meeting/${roomId}?name=${encodeURIComponent(name)}&host=${isHost}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      <div className="w-[90%] max-w-md bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-700">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 bg-gradient-to-br from-blue-600/30 to-purple-600/20 rounded-full mb-2">
            <Video className="text-blue-400 w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold">
            {isHost ? "Start Your Meeting" : "Join Meeting"}
          </h1>
          <p className="text-gray-400 text-sm">
            {isHost
              ? "You’re creating a new meeting room."
              : "Enter your name to join this meeting."}
          </p>
          {joinBlocked && (
            <div className="bg-yellow-900 p-3 rounded flex items-center gap-2 text-yellow-300 text-sm">
              <Clock size={16} /> {blockedMessage}
            </div>
          )}
        </div>

        <div className="mt-6">
          <label className="block mb-2 text-sm font-medium text-gray-300">Your Name</label>
          <div className="flex items-center bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
            <User className="text-gray-400 mr-2" size={18} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="bg-transparent flex-1 outline-none text-white placeholder-gray-500"
            />
          </div>
        </div>

        <button
          onClick={handleJoin}
          disabled={joinBlocked}
          className={`mt-8 w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-lg transition-all duration-200 ${
            joinBlocked
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isHost ? <Video size={18} /> : <User size={18} />}{" "}
          {isHost ? "Start Meeting" : "Join Now"} <ArrowRight size={16} />
        </button>
      </div>

      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="relative w-full max-w-md">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-2 right-2 text-white text-xl">
              ✕
            </button>
            <AuthForm onLogin={handleOnLogin} />
          </div>
        </div>
      )}
    </div>
  );
}
