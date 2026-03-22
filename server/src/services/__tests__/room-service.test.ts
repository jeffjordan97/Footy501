import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateRoomCode,
  createRoom,
  joinRoom,
  setRoomGameId,
  getRoom,
  removeRoom,
  findRoomBySocketId,
  removeGuestFromRoom,
  cleanupStaleRooms,
  getActiveRoomCount,
} from '../room-service.js';
import type { RoomConfig } from '../../types/socket-events.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultConfig: RoomConfig = {
  targetScore: 501,
  matchFormat: 3,
  timerDuration: 30,
  enableBogeyNumbers: false,
  categoryId: 'cat-1',
  categoryName: 'Premier League',
  league: 'EPL',
  statType: 'goals',
};

/**
 * Wipe every room from the in-memory store between tests.
 * We do this by collecting all codes and calling removeRoom on each.
 */
function clearAllRooms(): void {
  // We piggy-back on getActiveRoomCount to know whether work remains, then
  // use createRoom → code → removeRoom to drain the map without reaching into
  // private internals.  A simpler alternative: iterate via a known-created set.
  // Because we track created codes ourselves in each test, the easiest approach
  // is to create a sentinel, drain using findRoomBySocketId pattern below.
  //
  // Actually the simplest clean-slate: create a room with a unique sentinel
  // host, find it, then remove all rooms we created.  Instead, since
  // getActiveRoomCount gives us the size, we repeatedly call createRoom + track.
  //
  // Cleanest: since the module exposes no "clear all", we use the side-effect
  // of removeRoom on codes we recorded through test helpers below.
}

/** Track all room codes created in the current test so we can clean up. */
let createdCodes: string[] = [];

function makeRoom(
  hostSocketId = 'host-socket',
  hostUserId: string | null = 'host-user-id',
  hostName = 'HostPlayer',
  config: RoomConfig = defaultConfig,
) {
  const room = createRoom(hostSocketId, hostUserId, hostName, config);
  createdCodes.push(room.code);
  return room;
}

beforeEach(() => {
  // Remove all rooms created in the previous test.
  for (const code of createdCodes) {
    removeRoom(code);
  }
  createdCodes = [];
});

// ---------------------------------------------------------------------------
// generateRoomCode
// ---------------------------------------------------------------------------

describe('generateRoomCode', () => {
  it('returns a 6-character string', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
  });

  it('returns only uppercase alphanumeric characters', () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[0-9A-F]{6}$/);
  });

  it('generates unique codes on consecutive calls', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateRoomCode()));
    // All 20 should be distinct (statistically guaranteed for 6-char hex)
    expect(codes.size).toBe(20);
  });

  it('does not return a code that already exists in the store', () => {
    // Create a room so its code is in use, then verify a freshly generated
    // code differs (the do-while loop in the implementation guarantees this).
    const room = makeRoom();
    // Generate codes until we get one (beyond the first room's code).
    const newCode = generateRoomCode();
    expect(newCode).not.toBe(room.code);
  });
});

// ---------------------------------------------------------------------------
// createRoom
// ---------------------------------------------------------------------------

describe('createRoom', () => {
  it('returns a room with correct host properties', () => {
    const room = makeRoom('sock-1', 'user-1', 'Alice');
    expect(room.hostSocketId).toBe('sock-1');
    expect(room.hostUserId).toBe('user-1');
    expect(room.hostName).toBe('Alice');
  });

  it('returns a room with status "waiting"', () => {
    const room = makeRoom();
    expect(room.status).toBe('waiting');
  });

  it('initialises guest fields to null', () => {
    const room = makeRoom();
    expect(room.guestSocketId).toBeNull();
    expect(room.guestUserId).toBeNull();
    expect(room.guestName).toBeNull();
  });

  it('initialises gameId to null', () => {
    const room = makeRoom();
    expect(room.gameId).toBeNull();
  });

  it('stores the provided config', () => {
    const room = makeRoom('s', null, 'P', defaultConfig);
    expect(room.config).toEqual(defaultConfig);
  });

  it('sets createdAt to approximately now', () => {
    const before = Date.now();
    const room = makeRoom();
    const after = Date.now();
    expect(room.createdAt).toBeGreaterThanOrEqual(before);
    expect(room.createdAt).toBeLessThanOrEqual(after);
  });

  it('generates a 6-character uppercase code', () => {
    const room = makeRoom();
    expect(room.code).toMatch(/^[0-9A-F]{6}$/);
  });

  it('persists the room so getRoom returns it', () => {
    const room = makeRoom();
    expect(getRoom(room.code)).toEqual(room);
  });

  it('accepts null hostUserId (guest host)', () => {
    const room = makeRoom('s', null, 'GuestHost');
    expect(room.hostUserId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// joinRoom
// ---------------------------------------------------------------------------

describe('joinRoom', () => {
  it('returns updated room with guest details', () => {
    const room = makeRoom();
    const result = joinRoom(room.code, 'guest-sock', 'guest-user', 'Bob');
    expect(result).not.toBeNull();
    expect(result!.guestSocketId).toBe('guest-sock');
    expect(result!.guestUserId).toBe('guest-user');
    expect(result!.guestName).toBe('Bob');
  });

  it('transitions status from "waiting" to "ready"', () => {
    const room = makeRoom();
    const result = joinRoom(room.code, 'g-sock', null, 'Carol');
    expect(result!.status).toBe('ready');
  });

  it('is case-insensitive for the room code', () => {
    const room = makeRoom();
    const lower = room.code.toLowerCase();
    const result = joinRoom(lower, 'g-sock', null, 'Dave');
    expect(result).not.toBeNull();
  });

  it('returns null for a non-existent room code', () => {
    expect(joinRoom('ZZZZZZ', 'g-sock', null, 'Eve')).toBeNull();
  });

  it('returns null when the room already has a guest (full room)', () => {
    const room = makeRoom();
    joinRoom(room.code, 'g-sock-1', null, 'Frank');
    // Second join attempt should fail.
    const result = joinRoom(room.code, 'g-sock-2', null, 'Grace');
    expect(result).toBeNull();
  });

  it('returns null for a room that is not in "waiting" status', () => {
    const room = makeRoom('h-sock', null, 'Host');
    // Manually move to 'ready' by joining once …
    joinRoom(room.code, 'g-sock', null, 'Guest');
    // Now the room is 'ready'; a third player must be rejected.
    const result = joinRoom(room.code, 'other-sock', null, 'Other');
    expect(result).toBeNull();
  });

  it('persists the updated room so getRoom reflects the guest', () => {
    const room = makeRoom();
    joinRoom(room.code, 'g-sock', null, 'Hank');
    const stored = getRoom(room.code);
    expect(stored!.guestName).toBe('Hank');
  });
});

// ---------------------------------------------------------------------------
// setRoomGameId
// ---------------------------------------------------------------------------

describe('setRoomGameId', () => {
  it('updates the gameId and transitions status to "playing"', () => {
    const room = makeRoom();
    const updated = setRoomGameId(room.code, 'game-abc');
    expect(updated!.gameId).toBe('game-abc');
    expect(updated!.status).toBe('playing');
  });

  it('persists changes so getRoom reflects the new state', () => {
    const room = makeRoom();
    setRoomGameId(room.code, 'game-xyz');
    const stored = getRoom(room.code);
    expect(stored!.gameId).toBe('game-xyz');
    expect(stored!.status).toBe('playing');
  });

  it('returns null for a non-existent code', () => {
    expect(setRoomGameId('ZZZZZZ', 'game-id')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getRoom
// ---------------------------------------------------------------------------

describe('getRoom', () => {
  it('returns the room when it exists', () => {
    const room = makeRoom();
    expect(getRoom(room.code)).toEqual(room);
  });

  it('is case-insensitive', () => {
    const room = makeRoom();
    expect(getRoom(room.code.toLowerCase())).toEqual(room);
  });

  it('returns null for a non-existent code', () => {
    expect(getRoom('ZZZZZZ')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// removeRoom
// ---------------------------------------------------------------------------

describe('removeRoom', () => {
  it('deletes the room from the store', () => {
    const room = makeRoom();
    // Mark as cleaned up so beforeEach does not try again.
    createdCodes = createdCodes.filter((c) => c !== room.code);
    removeRoom(room.code);
    expect(getRoom(room.code)).toBeNull();
  });

  it('is a no-op for an unknown code (does not throw)', () => {
    expect(() => removeRoom('ZZZZZZ')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// findRoomBySocketId
// ---------------------------------------------------------------------------

describe('findRoomBySocketId', () => {
  it('finds a room by host socket ID', () => {
    const room = makeRoom('host-sock-find', null, 'FindHost');
    expect(findRoomBySocketId('host-sock-find')).toEqual(getRoom(room.code));
  });

  it('finds a room by guest socket ID after joining', () => {
    const room = makeRoom('h-sock-find2', null, 'H2');
    joinRoom(room.code, 'guest-sock-find2', null, 'G2');
    expect(findRoomBySocketId('guest-sock-find2')).not.toBeNull();
    expect(findRoomBySocketId('guest-sock-find2')!.code).toBe(room.code);
  });

  it('returns null for an unknown socket ID', () => {
    expect(findRoomBySocketId('no-such-socket')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// removeGuestFromRoom
// ---------------------------------------------------------------------------

describe('removeGuestFromRoom', () => {
  it('removes guest fields and resets status to "waiting" when no game started', () => {
    const room = makeRoom();
    joinRoom(room.code, 'g-sock', null, 'GuestToRemove');
    const result = removeGuestFromRoom(room.code);
    expect(result!.guestSocketId).toBeNull();
    expect(result!.guestUserId).toBeNull();
    expect(result!.guestName).toBeNull();
    expect(result!.status).toBe('waiting');
  });

  it('keeps "playing" status when a game has already started (gameId set)', () => {
    const room = makeRoom();
    joinRoom(room.code, 'g-sock', null, 'Guest');
    setRoomGameId(room.code, 'active-game-id');
    const result = removeGuestFromRoom(room.code);
    expect(result!.status).toBe('playing');
  });

  it('returns null for a non-existent room', () => {
    expect(removeGuestFromRoom('ZZZZZZ')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// cleanupStaleRooms
// ---------------------------------------------------------------------------

describe('cleanupStaleRooms', () => {
  it('returns 0 when there are no stale rooms', () => {
    makeRoom();
    expect(cleanupStaleRooms()).toBe(0);
  });

  it('removes rooms older than 1 hour that are in "waiting" status', () => {
    // Manipulate createdAt by using fake timers.
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() - TWO_HOURS_MS);

    const staleRoom = makeRoom('stale-host', null, 'StaleHost');

    // Advance time back to now before cleaning up.
    vi.useRealTimers();

    const cleaned = cleanupStaleRooms();
    expect(cleaned).toBeGreaterThanOrEqual(1);
    expect(getRoom(staleRoom.code)).toBeNull();
    // Remove from tracking since already gone.
    createdCodes = createdCodes.filter((c) => c !== staleRoom.code);
  });

  it('does NOT remove rooms with active games (playing status)', () => {
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() - TWO_HOURS_MS);

    const activeRoom = makeRoom('active-host', null, 'ActiveHost');

    vi.useRealTimers();

    // Transition to 'playing' — these must survive cleanup.
    joinRoom(activeRoom.code, 'g-sock', null, 'G');
    setRoomGameId(activeRoom.code, 'live-game');

    cleanupStaleRooms();
    expect(getRoom(activeRoom.code)).not.toBeNull();
  });

  it('does NOT remove recent "waiting" rooms', () => {
    const room = makeRoom();
    const cleaned = cleanupStaleRooms();
    expect(cleaned).toBe(0);
    expect(getRoom(room.code)).not.toBeNull();
  });
});
