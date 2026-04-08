import { io } from 'socket.io-client';

const isLocalHost =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

export const SERVER_URL = process.env.REACT_APP_SERVER_URL ||
  (isLocalHost ? 'http://localhost:3001' : 'https://quickchat-server.onrender.com');

const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});

export default socket;
