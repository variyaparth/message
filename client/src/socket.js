import { io } from 'socket.io-client';

export const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});

export default socket;
