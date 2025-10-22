// src/pages/UpcomingMeetings.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Video, Loader2 } from "lucide-react";

export default function UpcomingMeetings() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const username = localStorage.getItem("username");

  useEffect(() => {
    if (!username) {
      setError("You must be logged in to view meetings.");
      setLoading(false);
      return;
    }

    const fetchMeetings = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SERVER_URL || ""}/api/meetings/upcoming?host=${username}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load meetings");
        setMeetings(data.meetings || []);
      } catch (err) {
        console.error(err);
        setError("Unable to fetch meetings.");
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, [username]);

  const handleJoin = (meeting) => {
    const start = new Date(meeting.startTime);
    const now = new Date();

    if (now < start) {
      alert(
        `This meeting is scheduled for ${start.toLocaleString()}. You can join at or after this time.`
      );
      return;
    }

    navigate(`/join/${meeting.meetingId}?host=true`);
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">
        <Loader2 className="animate-spin mr-2" /> Loading meetings...
      </div>
    );

  if (error)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 text-red-400">
        {error}
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <Calendar className="text-blue-400" /> Upcoming Meetings
        </h1>

        {meetings.length === 0 ? (
          <div className="text-gray-400 text-center mt-20">
            No upcoming meetings found.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {meetings.map((meeting) => {
              const start = new Date(meeting.startTime);
              const now = new Date();
              const end = new Date(
                start.getTime() + meeting.durationMinutes * 60000
              );

              let status = "Upcoming";
              if (now >= start && now <= end) status = "Ongoing";
              else if (now > end) status = "Expired";

              return (
                <div
                  key={meeting.meetingId}
                  className="bg-gray-800 border border-gray-700 p-5 rounded-lg shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <h2 className="text-xl font-semibold text-blue-400 mb-2">
                      {meeting.title}
                    </h2>
                    <p className="text-gray-300 text-sm mb-3">
                      {meeting.description || "No description"}
                    </p>
                    <div className="flex items-center text-gray-400 text-sm gap-2">
                      <Clock size={16} />
                      {start.toLocaleString()}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between items-center">
                    <span
                      className={`text-sm font-semibold px-3 py-1 rounded ${
                        status === "Ongoing"
                          ? "bg-green-700 text-green-200"
                          : status === "Upcoming"
                          ? "bg-yellow-700 text-yellow-200"
                          : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {status}
                    </span>

                    {status !== "Expired" && (
                      <button
                        onClick={() => handleJoin(meeting)}
                        className={`flex items-center gap-2 px-4 py-2 rounded ${
                          status === "Ongoing"
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        <Video size={16} />
                        {status === "Ongoing" ? "Join Now" : "Start"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
