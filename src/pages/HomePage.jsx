// src/pages/HomePage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Video, ExternalLink, Calendar, Clock, ArrowRight } from 'lucide-react';
import Button from '../components/UI/Button.jsx';
import Card from '../components/UI/Card.jsx';
import { v4 as uuidv4 } from 'uuid';

export default function HomePage({ requireAuth }) {
  const [meetingIdInput, setMeetingIdInput] = useState('');
  const navigate = window.location; // we’ll navigate by changing window.location.href

  const handleStartQuickMeeting = () => {
    if (!requireAuth || !requireAuth()) return;
    const newMeetingId = uuidv4();
    window.location.href = `/join/${newMeetingId}?host=true`; // Host starts meeting
  };

  const handleJoinMeeting = () => {
    if (!requireAuth || !requireAuth()) return;
    if (meetingIdInput.trim()) {
      window.location.href = `/join/${meetingIdInput.trim()}`; // Participant joins meeting
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white">
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-white via-red-200 to-blue-200 bg-clip-text text-transparent">
            Collab Connect
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            High-performance meeting platform for collaboration
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button size="lg" icon={Video} onClick={handleStartQuickMeeting}>
              Start Quick Meeting
            </Button>

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
                onClick={handleJoinMeeting}
              >
                Join Meeting
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
