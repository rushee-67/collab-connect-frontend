// src/pages/JoinMeeting.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Video, User, ArrowRight } from "lucide-react";
import AuthForm from "../components/AuthForm.jsx"; // your existing auth form. :contentReference[oaicite:2]{index=2}

export default function JoinMeeting() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState(localStorage.getItem("cc_user_name") || "");
  const params = new URLSearchParams(window.location.search);
  const isHost = params.get("host") === "true";

  // local modal control for AuthForm
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // If not logged in, show auth modal
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    if (!token || !username) {
      setShowAuthModal(true);
    }
  }, []);

  // Called by AuthForm when login/signup succeeds.
  // AuthForm writes token/username to localStorage itself (it already does), so we just hide modal.
  const handleOnLogin = () => {
    setShowAuthModal(false);

    // If we don't yet have a name for cc_user_name, pre-populate with username.
    const stored = localStorage.getItem("cc_user_name");
    if (!stored) {
      const uname = localStorage.getItem("username") || "";
      if (uname) setName(uname);
    }
  };

  const handleJoin = () => {
    // Ensure logged in again (in case modal dismissed)
    const token = localStorage.getItem("token");
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    if (!name.trim()) {
      alert("Please enter your name before joining the meeting.");
      return;
    }

    // Save the display name locally
    localStorage.setItem("cc_user_name", name.trim());

    // Navigate to meeting page (MeetingRoom will read name & host)
    navigate(`/meeting/${roomId}?name=${encodeURIComponent(name.trim())}&host=${isHost}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      <div className="w-[90%] max-w-md bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-700">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 bg-gradient-to-br from-blue-600/30 to-purple-600/20 rounded-full mb-2">
            <Video className="text-blue-400 w-10 h-10" />
          </div>

          <h1 className="text-3xl font-bold">{isHost ? "Start Your Meeting" : "Join Meeting"}</h1>
          <p className="text-gray-400 text-sm">
            {isHost ? "You’re creating a new meeting room." : "Enter your name to join this meeting."}
          </p>

          <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 mt-2">
            <p className="text-sm text-gray-300">
              <span className="font-semibold text-blue-400">Room ID:</span> {roomId}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label className="block mb-2 text-sm font-medium text-gray-300">Your Name</label>
          <div className="flex items-center bg-gray-800 rounded-lg px-3 py-2 border border-gray-700 focus-within:ring-2 focus-within:ring-blue-500">
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
          className="mt-8 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-200"
        >
          {isHost ? (
            <>
              <Video size={18} /> Start Meeting <ArrowRight size={16} />
            </>
          ) : (
            <>
              <User size={18} /> Join Now <ArrowRight size={16} />
            </>
          )}
        </button>

        <p className="mt-6 text-xs text-gray-500 text-center">
          By continuing, you agree to Collab Connect’s collaboration policies.
        </p>
      </div>

      {/* Auth Modal overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-2 right-2 text-white text-xl"
            >
              ✕
            </button>

            {/* Pass onLogin handler — AuthForm writes token/username to localStorage and navigates -> dashboard by default; onLogin here will hide modal and let user continue */}
            <AuthForm onLogin={handleOnLogin} />
          </div>
        </div>
      )}
    </div>
  );
}
