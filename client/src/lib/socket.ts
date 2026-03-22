import { io, type Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '@/types/socket-events';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const API_URL = import.meta.env.VITE_API_URL ?? '';

let socket: TypedSocket | null = null;
let currentAuthToken: string | undefined;

export function getSocket(): TypedSocket {
  if (!socket) {
    socket = io(API_URL || undefined, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      auth: currentAuthToken ? { token: currentAuthToken } : undefined,
    }) as TypedSocket;
  }
  return socket;
}

export function connectSocket(authToken?: string): TypedSocket {
  // If auth token changed, recreate the socket with new auth
  if (authToken && authToken !== currentAuthToken) {
    currentAuthToken = authToken;
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }

  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}
