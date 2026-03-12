import React, { useState, useEffect, useRef, useCallback } from 'react';
import socket from '../socket';
import { SERVER_URL } from '../socket';
import MessageBubble from './MessageBubble';
import UserList from './UserList';
import ShareModal from './ShareModal';
import SettingsModal from './SettingsModal';
import VoiceRecorder from './VoiceRecorder';

const THEME_BG = {
  dark: 'from-slate-900 via-purple-900 to-slate-900',
  light: 'from-blue-50 via-white to-purple-50',
  ocean: 'from-cyan-900 via-blue-900 to-indigo-900',
  sunset: 'from-orange-900 via-red-900 to-purple-900',
  forest: 'from-green-900 via-emerald-900 to-teal-900',
};

export default function ChatRoom({ roomId, username, onLeave }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [users, setUsers] = useState([]);
  const [roomInfo, setRoomInfo] = useState({ name: 'Chat Room', theme: 'dark', createdBy: '' });
  const [typingUsers, setTypingUsers] = useState([]);
  const [showUsers, setShowUsers] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const isLight = roomInfo.theme === 'light';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, typingUsers, scrollToBottom]);

  useEffect(() => {
    socket.emit('join-room', { roomId, username }, (response) => {
      if (response.error) { setError(response.error); return; }
      setConnected(true);
      setMessages(response.room.messages || []);
      setUsers(response.room.users || []);
      setRoomInfo({ name: response.room.name, theme: response.room.theme, createdBy: response.room.createdBy });
    });

    socket.on('new-message', (msg) => setMessages((prev) => [...prev, msg]));

    socket.on('user-joined', ({ username: user, users: userList }) => {
      setUsers(userList);
      setMessages((prev) => [...prev, { id: `sys-${Date.now()}`, type: 'system', text: `${user} joined the room`, timestamp: Date.now() }]);
    });

    socket.on('user-left', ({ username: user, users: userList }) => {
      setUsers(userList);
      setTypingUsers((prev) => prev.filter((u) => u !== user));
      setMessages((prev) => [...prev, { id: `sys-${Date.now()}`, type: 'system', text: `${user} left the room`, timestamp: Date.now() }]);
    });

    socket.on('user-typing', ({ username: user, isTyping }) => {
      setTypingUsers((prev) => isTyping ? [...new Set([...prev, user])] : prev.filter((u) => u !== user));
    });

    socket.on('room-updated', ({ name, theme }) => {
      setRoomInfo((prev) => ({ ...prev, name, theme }));
    });

    socket.on('message-unsent', ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    return () => {
      socket.off('new-message');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('user-typing');
      socket.off('room-updated');
      socket.off('message-unsent');
    };
  }, [roomId, username]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    socket.emit('send-message', {
      text: text.trim(),
      type: 'text',
      replyTo: replyTo ? { id: replyTo.id, username: replyTo.username, text: replyTo.text, type: replyTo.type } : null,
    });
    setText('');
    setReplyTo(null);
    socket.emit('typing', false);
  };

  const handleUnsend = (messageId) => {
    socket.emit('unsend-message', { messageId });
  };

  const handleTyping = (value) => {
    setText(value);
    socket.emit('typing', true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socket.emit('typing', false), 2000);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/${roomId}/upload`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      socket.emit('send-message', { type: data.type, fileUrl: data.url, fileName: data.originalName });
    } catch {
      alert('Failed to upload file. Max size is 10MB.');
    }
    e.target.value = '';
  };

  const handleVoiceSend = async (blob) => {
    const formData = new FormData();
    formData.append('file', blob, 'voice-note.webm');
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/${roomId}/upload`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      socket.emit('send-message', { type: 'audio', fileUrl: data.url, fileName: 'Voice Note' });
    } catch {
      alert('Failed to send voice note.');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border border-white/20 text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-white mb-2">Room Not Found</h2>
          <p className="text-white/60 mb-6">{error}</p>
          <button onClick={onLeave} className="px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-500 transition-colors">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const themeBg = THEME_BG[roomInfo.theme] || THEME_BG.dark;

  return (
    <div className={`h-screen flex flex-col bg-gradient-to-br ${themeBg}`}>
      {/* Header */}
      <header className={`flex items-center justify-between px-4 py-3 border-b ${isLight ? 'bg-white/80 border-gray-200' : 'bg-black/20 border-white/10'} backdrop-blur-xl z-10 shrink-0`}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onLeave} className={`p-2 rounded-lg transition-colors shrink-0 ${isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/10 text-white/70'}`} title="Leave">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className={`font-bold truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>{roomInfo.name}</h1>
            <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-white/50'}`}>{users.length} online</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {roomInfo.createdBy === username && (
            <button onClick={() => setShowSettings(true)} className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/10 text-white/70'}`} title="Settings">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          <button onClick={() => setShowShare(true)} className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/10 text-white/70'}`} title="Share">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          <button onClick={() => setShowUsers(!showUsers)} className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/10 text-white/70'}`} title="Users">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            {messages.length === 0 && connected && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl mb-3">👋</div>
                  <p className={`${isLight ? 'text-gray-500' : 'text-white/50'}`}>No messages yet. Say hello!</p>
                </div>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} isOwn={msg.username === username} isLight={isLight}
                onReply={(m) => setReplyTo(m)} onUnsend={handleUnsend} />
            ))}
            {typingUsers.length > 0 && (
              <div className={`flex items-center gap-2 px-4 py-2 ${isLight ? 'text-gray-500' : 'text-white/50'} text-sm`}>
                <div className="flex gap-1">
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-current inline-block" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-current inline-block" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-current inline-block" />
                </div>
                <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className={`px-3 py-3 border-t ${isLight ? 'bg-white/80 border-gray-200' : 'bg-black/20 border-white/10'} backdrop-blur-xl shrink-0`}>
            {/* Reply bar */}
            {replyTo && (
              <div className={`flex items-center justify-between mb-2 pl-3 border-l-2 border-purple-400 rounded-r-lg py-2 px-3 ${isLight ? 'bg-purple-50' : 'bg-white/5'}`}>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold ${isLight ? 'text-purple-600' : 'text-purple-300'}`}>Replying to {replyTo.username}</p>
                  <p className={`text-xs truncate ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                    {replyTo.type === 'image' ? '📷 Photo' : replyTo.type === 'audio' ? '🎤 Voice Note' : replyTo.text?.slice(0, 60)}
                  </p>
                </div>
                <button onClick={() => setReplyTo(null)} className={`p-1 rounded-full shrink-0 ml-2 ${isLight ? 'hover:bg-gray-200 text-gray-400' : 'hover:bg-white/10 text-white/40'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
            <form onSubmit={handleSend} className="flex items-end gap-2 flex-1 min-w-0">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className={`p-2.5 rounded-xl transition-colors shrink-0 ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-white/50'}`} title="Upload Image">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
              <input type="text" value={text} onChange={(e) => handleTyping(e.target.value)} placeholder="Type a message..." maxLength={5000}
                className={`flex-1 px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all min-w-0 ${
                  isLight ? 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400' : 'bg-white/10 border-white/20 text-white placeholder-white/40'
                }`}
              />
              <button type="submit" disabled={!text.trim()} className="p-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
            <VoiceRecorder onSend={handleVoiceSend} isLight={isLight} />
            </div>
          </div>
        </div>

        {showUsers && (
          <UserList users={users} currentUser={username} createdBy={roomInfo.createdBy} isLight={isLight} onClose={() => setShowUsers(false)} />
        )}
      </div>

      {showShare && <ShareModal roomId={roomId} onClose={() => setShowShare(false)} isLight={isLight} />}
      {showSettings && <SettingsModal roomInfo={roomInfo} onClose={() => setShowSettings(false)} isLight={isLight} />}
    </div>
  );
}
