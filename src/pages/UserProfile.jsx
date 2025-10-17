import React from 'react';
import { User } from 'lucide-react';
import Card from '../components/UI/Card.jsx';

const UserProfile = ({ username, onLogout }) => {
  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          User Profile
        </h1>

        <Card className="p-8 text-center space-y-6">
          <User size={64} className="text-white mx-auto" />
          <h2 className="text-2xl font-bold text-white">{username}</h2>

          <button
            onClick={onLogout}
            className="px-6 py-3 bg-red-600 rounded-lg hover:bg-red-700 text-white font-medium"
          >
            Logout
          </button>
        </Card>
      </div>
    </div>
  );
};

export default UserProfile;
