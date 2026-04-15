import { io } from 'socket.io-client';

const isLocalHost =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

export const SERVER_URL = process.env.REACT_APP_SERVER_URL ||
  (isLocalHost ? 'http://localhost:3001' : 'https://quickchat-server.onrender.com');

const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  timeout: 15000,
  reconnectionAttempts: 5,
});

socket.on('connect', () => {
  console.info('[socket] connected', { id: socket.id, serverUrl: SERVER_URL });
});

socket.on('disconnect', (reason) => {
  console.warn('[socket] disconnected', { reason, serverUrl: SERVER_URL });
});

socket.on('connect_error', (error) => {
  console.error('[socket] connect_error', {
    message: error?.message,
    description: error?.description,
    serverUrl: SERVER_URL,
    transport: socket.io?.engine?.transport?.name,
  });
});

export default socket;
