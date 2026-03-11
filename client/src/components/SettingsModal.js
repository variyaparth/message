import React, { useState } from 'react';
import socket from '../socket';

const THEMES = [
  { id: 'dark', label: '🌙 Dark' },
  { id: 'light', label: '☀️ Light' },
  { id: 'ocean', label: '🌊 Ocean' },
  { id: 'sunset', label: '🌅 Sunset' },
  { id: 'forest', label: '🌲 Forest' },
];

export default function SettingsModal({ roomInfo, onClose, isLight }) {
  const [name, setName] = useState(roomInfo.name);
  const [theme, setTheme] = useState(roomInfo.theme);

  const handleSave = () => {
    socket.emit('update-room', { name: name.trim() || 'Chat Room', theme });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl ${isLight ? 'bg-white' : 'bg-slate-800 border border-white/10'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>⚙️ Room Settings</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-white/50'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-xs font-medium mb-1.5 uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Room Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={50}
              className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
                isLight ? 'bg-gray-100 border-gray-200 text-gray-900' : 'bg-white/10 border-white/20 text-white'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1.5 uppercase tracking-wider ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button key={t.id} onClick={() => setTheme(t.id)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    theme === t.id ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                      : isLight ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSave} className="w-full py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-500 transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
