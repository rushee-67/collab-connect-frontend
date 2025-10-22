// src/components/Dashboard.jsx
import { Routes, Route, useNavigate } from "react-router-dom";
import Header from "./Layout/Header.jsx";
import HomePage from "../pages/HomePage.jsx";
import UserProfile from "../pages/UserProfile.jsx";
import AuthForm from "./AuthForm.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import { v4 as uuidv4 } from "uuid";
import ScheduleMeeting from "../pages/ScheduleMeeting.jsx";

export default function Dashboard({
  isAuthenticated,
  onLogin,
  onLogout,
  showAuthForm,
  setShowAuthForm,
}) {
  const username = localStorage.getItem("username") || "User";
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate("/dashboard/home");
  };

  const handleStartQuickMeeting = () => {
    const newMeetingId = uuidv4();
    navigate(`/join/${newMeetingId}?host=true`);
  };

  const handleJoinMeeting = (meetingId) => {
    if (meetingId.trim()) navigate(`/join/${meetingId.trim()}`);
  };

  const requireAuth = () => {
    if (!isAuthenticated) {
      setShowAuthForm(true);
      return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-black text-white relative">
      <Header isAuthenticated={isAuthenticated} setShowAuthForm={setShowAuthForm} />
      <div className="pt-24 px-6">
        <Routes>
          <Route
            path="home"
            element={
              <HomePage
                requireAuth={requireAuth}
                onStartQuickMeeting={handleStartQuickMeeting}
                onJoinMeeting={handleJoinMeeting}
              />
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} setShowAuthForm={setShowAuthForm}>
                <UserProfile username={username} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="schedule"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated} setShowAuthForm={setShowAuthForm}>
                <ScheduleMeeting />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>

      {showAuthForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="relative w-full max-w-md">
            <button
              onClick={() => {
                setShowAuthForm(false);
                navigate("/dashboard/home");
              }}
              className="absolute top-2 right-2 text-white text-xl"
            >
              ✕
            </button>
            <AuthForm onLogin={onLogin} />
          </div>
        </div>
      )}
    </div>
  );
}
