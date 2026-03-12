import React, { useState, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import Lobby from './components/Lobby';
import ChatRoom from './components/ChatRoom';

function AppRoutes() {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleJoinRoom = useCallback((name, roomId) => {
    setUsername(name);
    navigate(`/room/${roomId}`);
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<Lobby onJoin={handleJoinRoom} />} />
      <Route path="/room/:roomId" element={<ChatRoomWrapper username={username} />} />
    </Routes>
  );
}

function ChatRoomWrapper({ username }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState(username);

  if (!name) {
    return (
      <JoinPrompt roomId={roomId} onJoin={(n) => setName(n)} onBack={() => navigate('/')} />
    );
  }

  return <ChatRoom roomId={roomId} username={name} onLeave={() => navigate('/')} />;
}

function JoinPrompt({ roomId, onJoin, onBack }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) onJoin(name.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md border border-white/20 shadow-2xl">
        <h2 className="text-2xl font-bold text-white text-center mb-2">Join Room</h2>
        <p className="text-purple-200 text-center mb-6 text-sm">Room: {roomId}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your username"
            maxLength={30}
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            autoFocus
          />
          <div className="flex gap-3">
            <button type="button" onClick={onBack} className="flex-1 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors">
              Back
            </button>
            <button type="submit" disabled={!name.trim()} className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              Join
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
