// src/pages/ScheduleMeeting.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ScheduleMeeting() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hostUsername = localStorage.getItem('username');
    if (!hostUsername) return alert('Please log in first.');

    const payload = {
      title,
      description,
      startTime: new Date(startTime).toISOString(),
      durationMinutes: Number(duration),
      hostUsername,
    };

    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL || ''}/api/meetings/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) return alert(data.message || 'Failed to schedule meeting');
      alert('Meeting scheduled successfully!');
      navigate('/dashboard/upcoming');
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert('Server error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h2 className="text-2xl font-bold mb-4">Schedule a Meeting</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 bg-gray-900 rounded border border-gray-700" placeholder="Meeting title" />
          </div>

          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 bg-gray-900 rounded border border-gray-700" placeholder="Optional description" />
          </div>

          <div>
            <label className="block text-sm mb-1">Start Time</label>
            <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-3 py-2 bg-gray-900 rounded border border-gray-700" />
          </div>

          <div>
            <label className="block text-sm mb-1">Duration (minutes)</label>
            <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-32 px-3 py-2 bg-gray-900 rounded border border-gray-700" />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 rounded">
              {loading ? 'Scheduling...' : 'Schedule Meeting'}
            </button>
            <button type="button" onClick={() => navigate('/dashboard/home')} className="px-4 py-2 bg-gray-700 rounded">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
