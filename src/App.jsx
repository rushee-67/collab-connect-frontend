import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard.jsx";
import { useState } from "react";

// Import meeting pages
import JoinMeeting from "./pages/JoinMeeting.jsx";
import MeetingRoom from "./pages/MeetingRoom.jsx";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setShowAuthForm(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("token");
    localStorage.removeItem("username");
  };

  return (
    <Router>
      <Routes>
        {/* Dashboard routes (with auth + layout) */}
        <Route
          path="/dashboard/*"
          element={
            <Dashboard
              isAuthenticated={isAuthenticated}
              onLogin={handleLogin}
              onLogout={handleLogout}
              showAuthForm={showAuthForm}
              setShowAuthForm={setShowAuthForm}
            />
          }
        />

        {/* Meeting flow routes (outside dashboard) */}
        <Route path="/join/:roomId" element={<JoinMeeting />} />
        <Route path="/meeting/:roomId" element={<MeetingRoom />} />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/dashboard/home" />} />
      </Routes>
    </Router>
  );
}
