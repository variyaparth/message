import React from 'react';

export default function UserList({ users, currentUser, createdBy, isLight, onClose }) {
  return (
    <div className={`w-64 border-l shrink-0 flex flex-col ${isLight ? 'bg-white/80 border-gray-200' : 'bg-black/20 border-white/10'} backdrop-blur-xl`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
        <h3 className={`font-semibold text-sm ${isLight ? 'text-gray-900' : 'text-white'}`}>
          Active Users ({users.length})
        </h3>
        <button onClick={onClose} className={`p-1 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-white/50'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {users.map((user, i) => (
          <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isLight ? 'hover:bg-gray-100' : 'hover:bg-white/5'} transition-colors`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
              user === currentUser ? 'bg-purple-600 text-white' : isLight ? 'bg-gray-200 text-gray-600' : 'bg-white/20 text-white'
            }`}>
              {user.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-medium truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>
                {user}
                {user === currentUser && <span className="text-xs text-purple-400 ml-1">(you)</span>}
              </p>
              {user === createdBy && (
                <p className={`text-xs ${isLight ? 'text-gray-400' : 'text-white/40'}`}>Room creator</p>
              )}
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
