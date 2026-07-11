import { io } from 'socket.io-client';

const isLocalHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const getServerUrl = () => {
  const configuredUrl = process.env.REACT_APP_SERVER_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  if (isLocalHost) return 'http://localhost:3001';

  return typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : 'http://localhost:3001';
};

export const SERVER_URL = getServerUrl();
export const API_BASE_URL = SERVER_URL.replace(/\/$/, '');

export async function checkServerHealth(timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
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

const socket = io(API_BASE_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  timeout: 30000,
  reconnectionAttempts: 5,
});

socket.on('connect', () => {
  console.info('[socket] connected', { id: socket.id, serverUrl: API_BASE_URL });
});

socket.on('disconnect', (reason) => {
  console.warn('[socket] disconnected', { reason, serverUrl: API_BASE_URL });
});

socket.on('connect_error', (error) => {
  console.error('[socket] connect_error', {
    message: error?.message,
    description: error?.description,
    serverUrl: API_BASE_URL,
    transport: socket.io?.engine?.transport?.name,
  });
});

export default socket;
