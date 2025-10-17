// src/pages/HomePage.jsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Video, ExternalLink, Calendar, Clock, ArrowRight } from 'lucide-react';
import Button from '../components/UI/Button.jsx';
import Card from '../components/UI/Card.jsx';

export default function HomePage({ 
  upcomingMeetings = [], 
  recentMeetings = [], 
  requireAuth,
  onStartQuickMeeting, // New prop
  onJoinMeeting // New prop
}) {
  const [meetingIdInput, setMeetingIdInput] = useState('');

  const handleAction = (callback) => {
    if (requireAuth && !requireAuth()) return;
    callback?.();
  };
  
  const handleJoin = () => {
    if (requireAuth && !requireAuth()) return;
    if (meetingIdInput.trim()) {
      onJoinMeeting(meetingIdInput.trim());
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white m-0 p-0 overflow-x-hidden">
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-red-200 to-blue-200 bg-clip-text text-transparent">
            Collab Connect
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            High-performance meeting platform designed for speed, precision, and seamless collaboration
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            {/* Start Quick Meeting Button */}
            <Button
              size="lg"
              icon={Video}
              onClick={() => handleAction(() => onStartQuickMeeting())}
            >
              Start Quick Meeting
            </Button>
            
            {/* Join Meeting via Link Input and Button */}
            <div className="flex flex-row items-center gap-4">
              <input
                type="text"
                value={meetingIdInput}
                onChange={(e) => setMeetingIdInput(e.target.value)}
                placeholder="Enter Meeting ID"
                className="p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                size="lg"
                variant="secondary"
                icon={ExternalLink}
                onClick={handleJoin}
              >
                Join Meeting
              </Button>
            </div>
          </div>
        </div>

        {/* Upcoming / Previous Cards */}
        <div className="grid lg:grid-cols-2 gap-8">
          <Card hover>
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-red-500/20 to-blue-500/20 rounded-lg">
                    <Calendar className="text-red-400" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Upcoming Meetings</h2>
                </div>
                <Link to="/dashboard/upcoming" onClick={(e) => !requireAuth?.() && e.preventDefault()}>
                  <ArrowRight className="text-gray-400 hover:text-white transition-colors duration-200" size={20} />
                </Link>
              </div>
              <Link to="/dashboard/upcoming" onClick={(e) => !requireAuth?.() && e.preventDefault()}>
                <Button variant="secondary" className="w-full">View All Upcoming</Button>
              </Link>
            </div>
          </Card>

          <Card hover>
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-red-500/20 to-blue-500/20 rounded-lg">
                    <Clock className="text-blue-400" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Previous Meetings</h2>
                </div>
                <Link to="/dashboard/previous" onClick={(e) => !requireAuth?.() && e.preventDefault()}>
                  <ArrowRight className="text-gray-400 hover:text-white transition-colors duration-200" size={20} />
                </Link>
              </div>
              <Link to="/dashboard/previous" onClick={(e) => !requireAuth?.() && e.preventDefault()}>
                <Button variant="secondary" className="w-full">View All Previous</Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-12">Everything You Need</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Schedule Meetings", icon: Calendar, desc: "Plan and organize your meetings with precision timing", link: "/dashboard/schedule" },
              { title: "Meeting Recordings", icon: Video, desc: "Access and manage all your meeting recordings", link: "/dashboard/recordings" },
              { title: "Shared Resources", icon: ExternalLink, desc: "Centralized hub for all meeting materials and files", link: "/dashboard/resources" }
            ].map((feature) => (
              <Link key={feature.title} to={feature.link} onClick={(e) => !requireAuth?.() && e.preventDefault()}>
                <Card hover className="h-full flex flex-col">
                  <div className="p-6 text-center flex flex-col h-full justify-between">
                    <div>
                      <div className="p-3 bg-gradient-to-br from-red-500/20 to-blue-500/20 rounded-lg w-fit mx-auto mb-4">
                        <feature.icon className="text-blue-400" size={32} />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                      <p className="text-gray-400">{feature.desc}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}