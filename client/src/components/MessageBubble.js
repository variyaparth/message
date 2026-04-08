import React, { useState, useRef, useCallback } from 'react';
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

function renderTextWithMentions(text, isLight) {
  if (!text) return text;
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('@')) {
      return (
        <span key={idx} className={`font-bold ${isLight ? 'text-blue-600' : 'text-blue-300'}`}>
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function MessageBubble({ message, isOwn, isLight, onReply, onUnsend, onEdit, onReaction, onPin, roomCreator, currentUser }) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const longPressTimer = useRef(null);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const bubbleRef = useRef(null);

  const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🙌', '✨'];

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

  const openMenu = (clientX, clientY) => {
    setMenuPos({ x: clientX, y: clientY });
    setShowMenu(true);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      if (Math.abs(touchDeltaX.current) < 10) {
        openMenu(touch.clientX, touch.clientY);
      }
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
    openMenu(e.clientX, e.clientY);
  };

  const handleDoubleClick = () => {
    if (onReply) onReply(message);
  };

  return (
    <div className={`flex items-center gap-1 ${isOwn ? 'justify-end' : 'justify-start'} mb-1 group`}>
      {/* Reply button (desktop) - before bubble for own messages */}
      {isOwn && (
        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
          {onUnsend && (
            <button onClick={() => onUnsend(message.id)}
              className="p-1.5 rounded-full hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-colors"
              title="Unsend">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          {onReply && (
            <button onClick={() => onReply(message)}
              className={`p-1.5 rounded-full transition-colors ${isLight ? 'hover:bg-gray-200 text-gray-400/60 hover:text-gray-500' : 'hover:bg-white/10 text-white/30 hover:text-white/60'}`}
              title="Reply">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v3M3 10l4-4M3 10l4 4" />
              </svg>
            </button>
          )}
        </div>
      )}

      <div ref={bubbleRef}
        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 select-none ${
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
        onDoubleClick={handleDoubleClick}
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
            <div className="flex gap-2 mt-2">
              <a href={`${SERVER_URL}${message.fileUrl}`} download={message.fileName}
                className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                  isOwn ? 'bg-purple-400 hover:bg-purple-300' : isLight ? 'bg-gray-200 hover:bg-gray-300' : 'bg-white/20 hover:bg-white/30'
                }`}>
                ⬇️ Download
              </a>
              {isOwn && (
                <button onClick={() => onUnsend?.(message.id)}
                  className="px-2 py-1 rounded-lg text-xs bg-red-500/50 hover:bg-red-500 transition-colors">
                  🗑️ Delete
                </button>
              )}
            </div>
          </div>
        )}

        {message.type === 'audio' && message.fileUrl && (
          <div className="mb-1">
            <audio controls className="max-w-full h-10" preload="metadata">
              <source src={`${SERVER_URL}${message.fileUrl}`} />
            </audio>
            <div className="flex gap-2 mt-2">
              <a href={`${SERVER_URL}${message.fileUrl}`} download={message.fileName || 'voice-note.webm'}
                className={`px-2 py-1 rounded-lg text-xs transition-colors ${
                  isOwn ? 'bg-purple-400 hover:bg-purple-300' : isLight ? 'bg-gray-200 hover:bg-gray-300' : 'bg-white/20 hover:bg-white/30'
                }`}>
                ⬇️ Download
              </a>
              {isOwn && (
                <button onClick={() => onUnsend?.(message.id)}
                  className="px-2 py-1 rounded-lg text-xs bg-red-500/50 hover:bg-red-500 transition-colors">
                  🗑️ Delete
                </button>
              )}
            </div>
          </div>
        )}

        {message.type === 'text' && message.text && (
          <p className="text-sm break-words whitespace-pre-wrap">{renderTextWithMentions(message.text, isOwn || !isLight)}</p>
        )}

        {/* Reactions display */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <button key={emoji} onClick={() => onReaction?.(message.id, emoji)}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-opacity hover:opacity-70 ${
                  users.includes(currentUser)
                    ? isOwn ? 'bg-purple-400' : isLight ? 'bg-purple-200' : 'bg-white/20'
                    : isOwn ? 'bg-purple-500/40' : isLight ? 'bg-gray-200' : 'bg-white/10'
                }`}>
                <span>{emoji}</span>
                <span className="text-[10px]">{users.length > 1 ? users.length : ''}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {message.isEdited && (
              <span className={`text-[10px] ${isOwn ? 'text-purple-200' : isLight ? 'text-gray-400' : 'text-white/40'}`}>(edited)</span>
            )}
            {message.isPinned && (
              <span className={`text-[10px] ${isOwn ? 'text-purple-200' : isLight ? 'text-gray-400' : 'text-white/40'}`}>📌</span>
            )}
          </div>
          <p className={`text-[10px] ${isOwn ? 'text-purple-200 text-right' : isLight ? 'text-gray-400' : 'text-white/40'}`}>
            {formatTime(message.timestamp)}
          </p>
        </div>

        {isOwn && message.read && Object.keys(message.read).length > 0 && (
          <div className="mt-1 flex items-center gap-1 justify-end">
            <span className="text-[9px] text-purple-200">✓✓</span>
            <span className="text-[9px] text-purple-200">{Object.keys(message.read).length}</span>
          </div>
        )}
      </div>

      {/* Reply button (desktop) - after bubble for others' messages */}
      {!isOwn && onReply && (
        <div className="hidden group-hover:flex items-center shrink-0">
          <button onClick={() => onReply(message)}
            className={`p-1.5 rounded-full transition-colors ${isLight ? 'hover:bg-gray-200 text-gray-400/60 hover:text-gray-500' : 'hover:bg-white/10 text-white/30 hover:text-white/60'}`}
            title="Reply">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v3M3 10l4-4M3 10l4 4" />
            </svg>
          </button>
        </div>
      )}

      {/* Context menu (fixed position - not clipped by overflow) */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setShowMenu(false)} />
          <div className="fixed z-[101] rounded-xl shadow-2xl overflow-hidden border"
            style={{ left: Math.min(menuPos.x, window.innerWidth - 200), top: Math.min(menuPos.y, window.innerHeight - 200) }}
            onClick={() => setShowMenu(false)}>
            <div className={`${isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-white/10'}`}>
              <button onClick={() => { onReply?.(message); setShowMenu(false); }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm w-full text-left transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-white'
                }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v3M3 10l4-4M3 10l4 4" />
                </svg>
                Reply
              </button>

              {isOwn && message.type === 'text' && (
                <button onClick={() => { onEdit?.(message); setShowMenu(false); }}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm w-full text-left transition-colors ${
                    isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-white'
                  }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
              
              <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm w-full text-left transition-colors ${
                  isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-white'
                }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                React
              </button>

              {roomCreator === currentUser && (
                <button onClick={() => { onPin?.(message.id); setShowMenu(false); }}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm w-full text-left transition-colors ${
                    isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-white'
                  }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h6a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  {message.isPinned ? 'Unpin' : 'Pin'}
                </button>
              )}

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
            
            {/* Emoji picker in context menu */}
            {showEmojiPicker && (
              <div className={`p-3 border-t flex flex-wrap gap-2 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-gray-700 border-gray-600'}`}>
                {EMOJI_REACTIONS.map((emoji) => (
                  <button key={emoji} onClick={() => { onReaction?.(message.id, emoji); setShowMenu(false); }}
                    className={`p-2 rounded-lg transition-colors ${
                      isLight ? 'hover:bg-gray-200' : 'hover:bg-gray-600'
                    }`}>
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
