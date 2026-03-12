import React, { useState, useRef } from 'react';
import { SERVER_URL } from '../socket';

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

function getReplyPreviewText(replyTo) {
  if (!replyTo) return '';
  if (replyTo.type === 'image') return '📷 Photo';
  if (replyTo.type === 'audio') return '🎤 Voice Note';
  return replyTo.text?.slice(0, 60) || '';
}

export default function MessageBubble({ message, isOwn, isLight, onReply, onUnsend }) {
  const [showMenu, setShowMenu] = useState(false);
  const longPressTimer = useRef(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const bubbleRef = useRef(null);

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

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    longPressTimer.current = setTimeout(() => {
      if (Math.abs(touchDeltaX.current) < 10) setShowMenu(true);
    }, 500);
  };

  const handleTouchMove = (e) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    touchDeltaX.current = dx;
    if (Math.abs(dx) > 10) clearTimeout(longPressTimer.current);
    const swipeDir = isOwn ? -dx : dx;
    if (swipeDir > 0 && swipeDir <= 80 && bubbleRef.current) {
      bubbleRef.current.style.transform = `translateX(${isOwn ? -swipeDir : swipeDir}px)`;
      bubbleRef.current.style.transition = 'none';
    }
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current);
    const swipeDir = isOwn ? -touchDeltaX.current : touchDeltaX.current;
    if (swipeDir > 50 && onReply) onReply(message);
    if (bubbleRef.current) {
      bubbleRef.current.style.transform = '';
      bubbleRef.current.style.transition = 'transform 0.2s ease';
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setShowMenu(true);
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 group relative`}>
      {/* Swipe reply indicator */}
      <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-1/2 -translate-y-1/2 opacity-30 pointer-events-none`}>
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v3M3 10l4-4M3 10l4 4" />
        </svg>
      </div>

      <div ref={bubbleRef}
        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 relative select-none ${
          isOwn
            ? 'bg-purple-600 text-white rounded-br-md'
            : isLight
              ? 'bg-white border border-gray-200 text-gray-900 rounded-bl-md shadow-sm'
              : 'bg-white/10 text-white rounded-bl-md'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
      >
        {!isOwn && (
          <p className={`text-xs font-semibold mb-0.5 ${nameColor}`}>{message.username}</p>
        )}

        {/* Reply preview */}
        {message.replyTo && (
          <div className={`mb-1.5 pl-2 border-l-2 rounded-r-lg py-1 px-2 text-xs ${
            isOwn
              ? 'border-purple-300 bg-purple-500/40'
              : isLight
                ? 'border-purple-400 bg-purple-50'
                : 'border-purple-400 bg-white/5'
          }`}>
            <p className={`font-semibold ${isOwn ? 'text-purple-200' : isLight ? 'text-purple-600' : 'text-purple-300'}`}>
              {message.replyTo.username}
            </p>
            <p className={`truncate ${isOwn ? 'text-purple-100' : isLight ? 'text-gray-500' : 'text-white/50'}`}>
              {getReplyPreviewText(message.replyTo)}
            </p>
          </div>
        )}

        {message.type === 'image' && message.fileUrl && (
          <div className="mb-1">
            <img src={`${SERVER_URL}${message.fileUrl}`} alt={message.fileName || 'Shared image'}
              className="rounded-lg max-h-64 w-auto cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(`${SERVER_URL}${message.fileUrl}`, '_blank')} loading="lazy"
            />
          </div>
        )}

        {message.type === 'audio' && message.fileUrl && (
          <div className="mb-1">
            <audio controls className="max-w-full h-10" preload="metadata">
              <source src={`${SERVER_URL}${message.fileUrl}`} />
            </audio>
          </div>
        )}

        {message.type === 'text' && message.text && (
          <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p>
        )}

        <p className={`text-[10px] mt-0.5 ${isOwn ? 'text-purple-200 text-right' : isLight ? 'text-gray-400' : 'text-white/40'}`}>
          {formatTime(message.timestamp)}
        </p>

        {/* Action buttons on hover (desktop) */}
        <div className={`absolute ${isOwn ? '-left-16' : '-right-16'} top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1`}>
          {onReply && (
            <button onClick={() => onReply(message)}
              className={`p-1.5 rounded-full transition-colors ${isLight ? 'hover:bg-gray-200 text-gray-400' : 'hover:bg-white/10 text-white/40'}`}
              title="Reply">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v3M3 10l4-4M3 10l4 4" />
              </svg>
            </button>
          )}
          {isOwn && onUnsend && (
            <button onClick={() => onUnsend(message.id)}
              className="p-1.5 rounded-full hover:bg-red-500/20 text-red-400 transition-colors"
              title="Unsend">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Long-press context menu (mobile) */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className={`absolute z-50 ${isOwn ? 'right-0' : 'left-0'} top-full mt-1 rounded-xl shadow-2xl overflow-hidden border ${
            isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-white/10'
          }`}>
            <button onClick={() => { onReply?.(message); setShowMenu(false); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm w-full text-left transition-colors ${
                isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-white'
              }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v3M3 10l4-4M3 10l4 4" />
              </svg>
              Reply
            </button>
            {isOwn && (
              <button onClick={() => { onUnsend?.(message.id); setShowMenu(false); }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm w-full text-left text-red-500 hover:bg-red-500/10 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Unsend
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
