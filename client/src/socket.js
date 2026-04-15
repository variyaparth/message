import { io } from 'socket.io-client';

const isLocalHost =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

export const SERVER_URL = process.env.REACT_APP_SERVER_URL ||
  (isLocalHost ? 'http://localhost:3001' : 'https://quickchat-server.onrender.com');

export async function checkServerHealth(timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${SERVER_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok && Boolean(data?.ok),
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      errorMessage: error?.message || 'unknown-error',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

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
