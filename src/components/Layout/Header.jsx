import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  User,
  Calendar,
  Clock,
  Plus,
  Video,
  FolderOpen,
} from "lucide-react";

const Header = ({ isAuthenticated, setShowAuthForm }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: "/dashboard/home", label: "Home", icon: Video },
    { path: "/dashboard/upcoming", label: "Upcoming", icon: Calendar },
    { path: "/dashboard/previous", label: "Previous", icon: Clock },
    { path: "/dashboard/schedule", label: "Schedule", icon: Plus },
    { path: "/dashboard/recordings", label: "Recordings", icon: Video },
    { path: "/dashboard/resources", label: "Resources", icon: FolderOpen },
  ];

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <header className="fixed top-0 left-0 right-0 bg-black/95 backdrop-blur-sm border-b border-gray-800 z-50">
      <div className="max-w-9xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-20">
          {/* Left side: Logo + Navigation */}
          <div className="flex items-center space-x-6">
            {/* Logo */}
            <Link
              to="/dashboard/home"
              className="flex items-center space-x-3 group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-blue-600 rounded-lg flex items-center justify-center transform group-hover:scale-105 transition-transform duration-200">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="text-white font-bold text-xl tracking-tight cursor-pointer whitespace-nowrap">
                Collab Connect
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden lg:flex items-center space-x-6">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive(item.path)
                        ? "text-white bg-gradient-to-r from-red-500/20 to-blue-500/20 border border-red-500/30"
                        : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                    }`}
                  >
                    {IconComponent && <IconComponent size={18} />}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side: Auth buttons */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <Link
                to="/dashboard/profile"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive("/dashboard/profile")
                    ? "text-white bg-gradient-to-r from-red-500/20 to-blue-500/20 border border-red-500/30"
                    : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                <User
                  size={18}
                  className="text-white group-hover:scale-110 transition-transform duration-200"
                />
                <span className="text-white font-medium hidden sm:block">
                  Profile
                </span>
              </Link>
            ) : (
              <button
                onClick={() => setShowAuthForm("login")}
                className="px-4 py-2 bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-lg hover:from-blue-500/20 hover:to-blue-600/20 text-white font-medium transition-all duration-200 whitespace-nowrap"
              >
                Login / Signup
              </button>
            )}

            {/* Mobile toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-white hover:bg-gray-800/50 rounded-lg transition-colors duration-200"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-800">
            <nav className="flex flex-col space-y-3">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive(item.path)
                        ? "text-white bg-gradient-to-r from-red-500/20 to-blue-500/20 border border-red-500/30"
                        : "text-gray-300 hover:text-white hover:bg-gray-800/50"
                    }`}
                  >
                    {IconComponent && <IconComponent size={18} />}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
