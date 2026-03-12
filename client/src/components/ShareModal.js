import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function ShareModal({ roomId, onClose, isLight }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}${process.env.PUBLIC_URL || ''}/#/room/${roomId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl ${isLight ? 'bg-white' : 'bg-slate-800 border border-white/10'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>Share Room</h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-500' : 'hover:bg-white/10 text-white/50'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex justify-center mb-5">
          <div className="bg-white p-4 rounded-xl">
            <QRCodeSVG value={shareUrl} size={180} level="M" />
          </div>
        </div>

        <div className="mb-4 text-center">
          <p className={`text-xs uppercase tracking-wider mb-1 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Room ID</p>
          <p className={`text-lg font-mono font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{roomId}</p>
        </div>

        <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 ${isLight ? 'bg-gray-100' : 'bg-white/10'}`}>
          <input type="text" value={shareUrl} readOnly className={`flex-1 text-sm bg-transparent outline-none min-w-0 ${isLight ? 'text-gray-700' : 'text-white/80'}`} />
          <button onClick={handleCopy} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0 ${copied ? 'bg-green-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-500'}`}>
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>

        <p className={`text-xs text-center ${isLight ? 'text-gray-400' : 'text-white/30'}`}>
          Scan the QR code or share the link to invite others
        </p>
      </div>
    </div>
  );
}
