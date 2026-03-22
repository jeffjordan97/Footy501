import { randomBytes } from 'node:crypto';
import type { RoomConfig, RoomDetail } from '../types/socket-events.js';

export interface Room {
  readonly code: string;
  readonly hostSocketId: string;
  readonly hostUserId: string | null;
  readonly hostName: string;
  readonly guestSocketId: string | null;
  readonly guestUserId: string | null;
  readonly guestName: string | null;
  readonly gameId: string | null;
  readonly config: RoomConfig;
  readonly status: 'waiting' | 'ready' | 'playing' | 'finished';
  readonly createdAt: number;
}

// In-memory room store
const rooms = new Map<string, Room>();

/**
 * Generate a unique 6-character room code (uppercase alphanumeric).
 * Re-rolls if the code already exists (extremely unlikely).
 */
export function generateRoomCode(): string {
  let code: string;
  do {
    code = randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
  } while (rooms.has(code));
  return code;
}

/**
 * Create a new room with the given host and game configuration.
 */
export function createRoom(
  hostSocketId: string,
  hostUserId: string | null,
  hostName: string,
  config: RoomConfig,
): Room {
  const code = generateRoomCode();
  const room: Room = {
    code,
    hostSocketId,
    hostUserId,
    hostName,
    guestSocketId: null,
    guestUserId: null,
    guestName: null,
    gameId: null,
    config,
    status: 'waiting',
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

/**
 * Join an existing room as a guest.
 * Returns null if the room does not exist, is not waiting, or is already full.
 */
export function joinRoom(
  code: string,
  guestSocketId: string,
  guestUserId: string | null,
  guestName: string,
): Room | null {
  const room = rooms.get(code.toUpperCase());
  if (!room || room.status !== 'waiting') return null;
  if (room.guestSocketId !== null) return null;

  const updated: Room = {
    ...room,
    guestSocketId,
    guestUserId,
    guestName,
    status: 'ready',
  };
  rooms.set(room.code, updated);
  return updated;
}

/**
 * Set the game ID once the game starts and transition to 'playing'.
 */
export function setRoomGameId(code: string, gameId: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  const updated: Room = { ...room, gameId, status: 'playing' };
  rooms.set(code, updated);
  return updated;
}

/**
 * Get a room by its code. Case-insensitive.
 */
export function getRoom(code: string): Room | null {
  return rooms.get(code.toUpperCase()) ?? null;
}

/**
 * Remove a room entirely.
 */
export function removeRoom(code: string): void {
  rooms.delete(code.toUpperCase());
}

/**
 * Find the room a given socket belongs to (as host or guest).
 */
export function findRoomBySocketId(socketId: string): Room | null {
  for (const room of rooms.values()) {
    if (room.hostSocketId === socketId || room.guestSocketId === socketId) {
      return room;
    }
  }
  return null;
}

/**
 * Find the room a given userId belongs to (as host or guest).
 */
export function findRoomByUserId(userId: string): Room | null {
  for (const room of rooms.values()) {
    if (room.hostUserId === userId || room.guestUserId === userId) {
      return room;
    }
  }
  return null;
}

/**
 * Remove the guest from a room and reset to 'waiting' if the game has not started.
 */
export function removeGuestFromRoom(code: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  const updated: Room = {
    ...room,
    guestSocketId: null,
    guestUserId: null,
    guestName: null,
    status: room.gameId ? 'playing' : 'waiting',
  };
  rooms.set(code, updated);
  return updated;
}

/**
 * Remove rooms older than 1 hour that are still in 'waiting' status.
 * Returns the number of rooms cleaned up.
 */
export function cleanupStaleRooms(): number {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  let cleaned = 0;
  for (const [code, room] of rooms) {
    if (room.createdAt < oneHourAgo && room.status === 'waiting') {
      rooms.delete(code);
      cleaned++;
    }
  }
  return cleaned;
}

/**
 * Get the total number of active rooms.
 */
export function getActiveRoomCount(): number {
  return rooms.size;
}

/**
 * Convert an internal Room to a client-safe RoomDetail.
 */
export function toRoomDetail(room: Room): RoomDetail {
  return {
    code: room.code,
    hostName: room.hostName,
    guestName: room.guestName,
    gameId: room.gameId,
    config: room.config,
    status: room.status,
    createdAt: room.createdAt,
  };
}
