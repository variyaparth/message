import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';

export default function DirectMessages({ username, isLight, onClose }) {
  const [dmList, setDmList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [dmText, setDmText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.emit('get-dm-list', (list) => {
      setDmList(list);
    });

    socket.on('dm-received', (msg) => {
      if (selectedUser === msg.from) {
        setMessages((prev) => [...prev, msg]);
        socket.emit('mark-dm-read', { from: msg.from });
      }
      setDmList((prev) => {
        const idx = prev.findIndex((d) => d.username === msg.from);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], lastMessage: msg.text, timestamp: msg.timestamp };
          return updated.sort((a, b) => b.timestamp - a.timestamp);
        }
        return prev;
      });
    });

    socket.on('dm-sent', (msg) => {
      if (selectedUser === msg.to) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => {
      socket.off('dm-received');
      socket.off('dm-sent');
    };
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setMessages([]);
    socket.emit('get-dms', { otherUser: user }, (dms) => {
      setMessages(dms);
    });
  };

  const handleSendDM = (e) => {
    e.preventDefault();
    if (!dmText.trim() || !selectedUser) return;
    socket.emit('send-dm', { recipientUsername: selectedUser, text: dmText.trim() });
    setDmText('');
  };

  return (
    <div className={`fixed inset-0 z-50 ${isLight ? 'bg-black/30' : 'bg-black/50'} flex items-center justify-center p-4`}>
      <div className={`w-full max-w-2xl h-[80vh] rounded-2xl overflow-hidden shadow-2xl flex ${isLight ? 'bg-white' : 'bg-gray-900'}`}>
        {/* DM List */}
        <div className={`w-64 border-r flex flex-col ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-gray-800 border-gray-700'}`}>
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className={`font-bold text-lg ${isLight ? 'text-gray-900' : 'text-white'}`}>Messages</h2>
            <button onClick={onClose} className={`p-1 rounded-lg ${isLight ? 'hover:bg-gray-200' : 'hover:bg-gray-700'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {dmList.length === 0 ? (
              <div className={`p-4 text-center text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                No messages yet
              </div>
            ) : (
              dmList.map((dm) => (
                <button
                  key={dm.username}
                  onClick={() => handleSelectUser(dm.username)}
                  className={`w-full px-4 py-3 text-left border-b transition-colors ${
                    selectedUser === dm.username
                      ? isLight ? 'bg-purple-100' : 'bg-purple-900/30'
                      : isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-700'
                  } ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <p className={`font-semibold text-sm ${isLight ? 'text-gray-900' : 'text-white'}`}>
                      <span className="flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        {dm.username}
                      </span>
                      {dm.unread > 0 && (
                        <span className="ml-2 inline-block w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                          {dm.unread}
                        </span>
                      )}
                    </p>
                  </div>
                  <p className={`text-xs truncate ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                    {dm.lastMessage}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        {selectedUser ? (
          <div className="flex-1 flex flex-col">
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'}`}>
              <h3 className={`font-bold text-lg ${isLight ? 'text-gray-900' : 'text-white'}`}>{selectedUser}</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.from === username ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs rounded-lg px-4 py-2 ${
                      msg.from === username
                        ? 'bg-purple-600 text-white rounded-br-md'
                        : isLight ? 'bg-gray-200 text-gray-900 rounded-bl-md' : 'bg-gray-700 text-white rounded-bl-md'
                    }`}>
                    <p className="text-sm break-words">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.from === username ? 'text-purple-100' : isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendDM} className={`p-4 border-t ${isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'}`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={dmText}
                  onChange={(e) => setDmText(e.target.value)}
                  placeholder="Type a message..."
                  className={`flex-1 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                    isLight ? 'bg-gray-100 border-gray-200 text-gray-900' : 'bg-gray-700 text-white'
                  }`} />
                <button type="submit" disabled={!dmText.trim()}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors disabled:opacity-30">
                  Send
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className={isLight ? 'text-gray-500' : 'text-gray-400'}>Select a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
