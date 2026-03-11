import React from 'react';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getUserColor(name) {
  const colors = ['text-pink-400','text-blue-400','text-green-400','text-yellow-400','text-purple-400','text-cyan-400','text-orange-400','text-rose-400','text-emerald-400','text-indigo-400','text-teal-400','text-amber-400'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getUserColorLight(name) {
  const colors = ['text-pink-600','text-blue-600','text-green-600','text-yellow-600','text-purple-600','text-cyan-600','text-orange-600','text-rose-600','text-emerald-600','text-indigo-600','text-teal-600','text-amber-600'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function MessageBubble({ message, isOwn, isLight }) {
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className={`text-xs px-3 py-1 rounded-full ${isLight ? 'bg-gray-200 text-gray-500' : 'bg-white/10 text-white/40'}`}>
          {message.text}
        </span>
      </div>
    );
  }

  const nameColor = isLight ? getUserColorLight(message.username) : getUserColor(message.username);

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 group`}>
      <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 ${
        isOwn
          ? 'bg-purple-600 text-white rounded-br-md'
          : isLight
            ? 'bg-white border border-gray-200 text-gray-900 rounded-bl-md shadow-sm'
            : 'bg-white/10 text-white rounded-bl-md'
      }`}>
        {!isOwn && (
          <p className={`text-xs font-semibold mb-0.5 ${nameColor}`}>{message.username}</p>
        )}

        {message.type === 'image' && message.fileUrl && (
          <div className="mb-1">
            <img src={`http://localhost:3001${message.fileUrl}`} alt={message.fileName || 'Shared image'}
              className="rounded-lg max-h-64 w-auto cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(`http://localhost:3001${message.fileUrl}`, '_blank')} loading="lazy"
            />
          </div>
        )}

        {message.type === 'audio' && message.fileUrl && (
          <div className="mb-1">
            <audio controls className="max-w-full h-10" preload="metadata">
              <source src={`http://localhost:3001${message.fileUrl}`} />
            </audio>
          </div>
        )}

        {message.type === 'text' && message.text && (
          <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p>
        )}

        <p className={`text-[10px] mt-0.5 ${isOwn ? 'text-purple-200 text-right' : isLight ? 'text-gray-400' : 'text-white/40'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
