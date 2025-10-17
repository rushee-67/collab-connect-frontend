import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./components/Dashboard.jsx";
import { useState } from "react";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setShowAuthForm(false); // close modal after login/signup
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("token");
    localStorage.removeItem("username");
  };

  return (
    <Router>
      <Routes>
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
        {/* Default redirect to homepage */}
        <Route path="*" element={<Navigate to="/dashboard/home" />} />
      </Routes>
    </Router>
  );
}
