import { io } from 'socket.io-client';

const isBrowser = typeof window !== 'undefined';

export const SERVER_URL =
  process.env.REACT_APP_SERVER_URL ||
  (process.env.NODE_ENV === 'production' && isBrowser
    ? window.location.origin
    : 'http://localhost:3001');

export const API_BASE_URL = SERVER_URL.replace(/\/$/, '');

const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});

export default socket;
