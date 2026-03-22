/**
 * Tracks active player connections for reconnection support.
 *
 * Maps userId -> their active game session info so that when a player
 * disconnects and reconnects, the server can restore them to their game.
 */

export interface PlayerConnection {
  readonly socketId: string;
  readonly userId: string;
  readonly gameId: string;
  readonly playerIndex: 0 | 1;
  readonly roomCode: string | null;
  readonly disconnectedAt: number | null;
}

/** userId -> PlayerConnection */
const connections = new Map<string, PlayerConnection>();

/** socketId -> userId (reverse index for fast disconnect lookup) */
const socketToUser = new Map<string, string>();

const RECONNECT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Register a player connection when they join a game.
 */
export function registerConnection(userId: string, conn: PlayerConnection): void {
  // Clean up any previous socket mapping for this user
  const existing = connections.get(userId);
  if (existing) {
    socketToUser.delete(existing.socketId);
  }

  connections.set(userId, conn);
  socketToUser.set(conn.socketId, userId);
}

/**
 * Mark a player as disconnected but keep the entry for the reconnect window.
 * Returns the connection if found, null otherwise.
 */
export function markDisconnected(socketId: string): PlayerConnection | null {
  const userId = socketToUser.get(socketId);
  if (!userId) return null;

  const conn = connections.get(userId);
  if (!conn) return null;

  socketToUser.delete(socketId);

  const updated: PlayerConnection = {
    ...conn,
    disconnectedAt: Date.now(),
  };
  connections.set(userId, updated);
  return updated;
}

/**
 * Remove a connection entirely (e.g., game finished or reconnect window expired).
 */
export function removeConnection(userId: string): PlayerConnection | null {
  const conn = connections.get(userId);
  if (!conn) return null;

  connections.delete(userId);
  socketToUser.delete(conn.socketId);
  return conn;
}

/**
 * Get a connection by userId. Returns null if not found or if the
 * reconnect window has expired.
 */
export function getConnection(userId: string): PlayerConnection | null {
  const conn = connections.get(userId);
  if (!conn) return null;

  // If disconnected, check if within the reconnect window
  if (conn.disconnectedAt !== null) {
    const elapsed = Date.now() - conn.disconnectedAt;
    if (elapsed > RECONNECT_WINDOW_MS) {
      connections.delete(userId);
      return null;
    }
  }

  return conn;
}

/**
 * Get a connection by socketId (for disconnect handling).
 */
export function getConnectionBySocketId(socketId: string): PlayerConnection | null {
  const userId = socketToUser.get(socketId);
  if (!userId) return null;
  return connections.get(userId) ?? null;
}

/**
 * Update a connection with a new socketId after reconnection.
 */
export function updateConnectionSocket(userId: string, newSocketId: string): PlayerConnection | null {
  const conn = connections.get(userId);
  if (!conn) return null;

  // Remove old socket mapping
  socketToUser.delete(conn.socketId);

  const updated: PlayerConnection = {
    ...conn,
    socketId: newSocketId,
    disconnectedAt: null,
  };
  connections.set(userId, updated);
  socketToUser.set(newSocketId, userId);
  return updated;
}

/**
 * Clean up expired disconnected connections.
 * Returns the number of connections cleaned up.
 */
export function cleanupExpiredConnections(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [userId, conn] of connections) {
    if (conn.disconnectedAt !== null && now - conn.disconnectedAt > RECONNECT_WINDOW_MS) {
      connections.delete(userId);
      socketToUser.delete(conn.socketId);
      cleaned++;
    }
  }

  return cleaned;
}
