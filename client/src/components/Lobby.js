import React, { useState } from 'react';
import socket from '../socket';

const THEMES = [
  { id: 'dark', label: '🌙 Dark' },
  { id: 'light', label: '☀️ Light' },
  { id: 'ocean', label: '🌊 Ocean' },
  { id: 'sunset', label: '🌅 Sunset' },
  { id: 'forest', label: '🌲 Forest' },
];

export default function Lobby({ onJoin }) {
  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('dark');
  const [mode, setMode] = useState('create');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ensureSocketConnected = () => new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve();
      return;
    }

    const timeoutId = setTimeout(() => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
      reject(new Error('Connection failed'));
    }, 15000);

    const onConnect = () => {
      clearTimeout(timeoutId);
      socket.off('connect_error', onError);
      resolve();
    };

    const onError = () => {
      clearTimeout(timeoutId);
      socket.off('connect', onConnect);
      reject(new Error('Connection failed'));
    };

    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
    if (!socket.connected) socket.connect();
  });

  const emitWithAck = async (event, payload, onSuccess) => {
    try {
      await ensureSocketConnected();
    } catch {
      setLoading(false);
      setError('Unable to connect to server. Please check your connection.');
      return;
    }

    socket.timeout(15000).emit(event, payload, (err, response) => {
      setLoading(false);

      if (err) {
        setError('Server is slow to respond. Please try again.');
        return;
      }

      if (response?.error) {
        setError(response.error);
        return;
      }

      onSuccess(response);
    });
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError('');

    emitWithAck(
      'create-room',
      { username: username.trim(), roomName: roomName.trim() || 'Chat Room', theme: selectedTheme },
      (response) => onJoin(username.trim(), response.roomId)
    );
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!username.trim() || !joinRoomId.trim()) return;
    setLoading(true);
    setError('');

    let roomId = joinRoomId.trim();
    const urlMatch = roomId.match(/\/room\/([a-f0-9]+)/i);
    if (urlMatch) roomId = urlMatch[1];

    emitWithAck(
      'join-room',
      { roomId, username: username.trim() },
      () => onJoin(username.trim(), roomId)
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">💬</div>
          <h1 className="text-4xl font-bold text-white mb-2">QuickChat</h1>
          <p className="text-purple-200/70">Instant messaging, no signup needed</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => { setMode('create'); setError(''); }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                mode === 'create' ? 'text-white bg-white/10 border-b-2 border-purple-400' : 'text-white/50 hover:text-white/80'
              }`}
            >
              ✨ Create Room
            </button>
            <button
              onClick={() => { setMode('join'); setError(''); }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                mode === 'join' ? 'text-white bg-white/10 border-b-2 border-purple-400' : 'text-white/50 hover:text-white/80'
              }`}
            >
              🚪 Join Room
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm text-center">
                {error}
              </div>
            )}

            {mode === 'create' ? (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-white/70 text-xs font-medium mb-1.5 uppercase tracking-wider">Your Name</label>
                  <input
                    type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username" maxLength={30}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-xs font-medium mb-1.5 uppercase tracking-wider">Room Name</label>
                  <input
                    type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)}
                    placeholder="My Chat Room (optional)" maxLength={50}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-xs font-medium mb-1.5 uppercase tracking-wider">Theme</label>
                  <div className="flex gap-2 flex-wrap">
                    {THEMES.map((t) => (
                      <button key={t.id} type="button" onClick={() => setSelectedTheme(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedTheme === t.id ? 'bg-purple-500 text-white ring-2 ring-purple-300' : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={!username.trim() || loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25"
                >
                  {loading ? 'Creating...' : '🚀 Create Room'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-white/70 text-xs font-medium mb-1.5 uppercase tracking-wider">Your Name</label>
                  <input
                    type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username" maxLength={30}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-xs font-medium mb-1.5 uppercase tracking-wider">Room ID or Link</label>
                  <input
                    type="text" value={joinRoomId} onChange={(e) => setJoinRoomId(e.target.value)}
                    placeholder="Paste room ID or link"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  />
                </div>
                <button type="submit" disabled={!username.trim() || !joinRoomId.trim() || loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
                >
                  {loading ? 'Joining...' : '🚪 Join Room'}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          Rooms are temporary and deleted when empty
        </p>
      </div>
    </div>
  );
}
