import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '../types/socket-events.js';
import type { MatchState, TurnResult } from '../lib/game-engine/types.js';
import { submitGameAnswer, handleGameTimeout, getGame } from '../services/game-service.js';

const SubmitAnswerEventSchema = z.object({
  gameId: z.string().uuid(),
  footballerId: z.string().min(1).max(64),
  footballerName: z.string().min(1).max(100),
});

const TimeoutEventSchema = z.object({
  gameId: z.string().uuid(),
});
import { verifyToken } from '../services/auth-service.js';
import {
  registerConnection,
  markDisconnected,
  getConnection,
  getConnectionBySocketId,
  updateConnectionSocket,
} from '../services/connection-service.js';
import { findRoomByUserId } from '../services/room-service.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// Track which game each socket is in and which player seat they occupy
interface GameSeat {
  readonly gameId: string;
  readonly playerIndex: 0 | 1;
}

const socketGameMap = new Map<string, GameSeat>();

// Per-game mutex to prevent concurrent state mutations
const gameLocks = new Map<string, Promise<void>>();

async function withGameLock<T>(gameId: string, fn: () => Promise<T>): Promise<T> {
  const existing = gameLocks.get(gameId) ?? Promise.resolve();
  const next = existing.then(fn, fn);
  gameLocks.set(gameId, next.then(() => {}, () => {}));
  return next;
}

/**
 * Register WebSocket event handlers for real-time game state updates.
 */
export function registerGameHandlers(io: TypedServer): void {
  io.on('connection', (socket: TypedSocket) => {
    // Authenticate via token in handshake auth
    const token = socket.handshake.auth?.token as string | undefined;
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        socket.data.user = { userId: payload.userId, displayName: payload.displayName };
        console.log(`Client connected: ${socket.id} (user: ${payload.displayName})`);
      } else {
        console.log(`Client connected: ${socket.id} (invalid token, anonymous)`);
      }
    } else {
      console.log(`Client connected: ${socket.id} (anonymous)`);
    }

    // --- game:submit-answer -----------------------------------------------
    socket.on('game:submit-answer', async (data, callback) => {
      const parsed = SubmitAnswerEventSchema.safeParse(data);
      if (!parsed.success) {
        callback({ success: false, error: 'Invalid input' });
        return;
      }
      const { gameId, footballerId, footballerName } = parsed.data;

      // Auth: verify socket is a participant in this game
      const seat = socketGameMap.get(socket.id);
      if (!seat || seat.gameId !== gameId) {
        callback({ success: false, error: 'Not a participant in this game' });
        return;
      }

      try {
        await withGameLock(gameId, async () => {
          const game = await getGame(gameId);
          if (!game) {
            callback({ success: false, error: 'Game not found' });
            return;
          }

          const currentState = game.state as MatchState;
          const currentLeg = currentState.legs[currentState.currentLegIndex];
          const activePlayerIndex = currentLeg?.currentPlayerIndex ?? 0;

          // Turn ownership: verify it's this socket's turn
          if (seat.playerIndex !== activePlayerIndex) {
            callback({ success: false, error: 'Not your turn' });
            return;
          }

          const result = await submitGameAnswer(gameId, activePlayerIndex, footballerId, footballerName);

          io.to(`game:${gameId}`).emit('game:state', result.state);
          io.to(`game:${gameId}`).emit('game:turn-result', {
            success: true,
            turnResult: result.turnResult as TurnResult,
            bustReason: result.bustMessage,
            scoreDeducted: result.statValue ?? 0,
            newScore: 0,
            isCheckout: result.turnResult === 'CHECKOUT',
            updatedState: result.state,
          });

          callback({ success: true });
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to submit answer';
        socket.emit('game:error', { message });
        callback({ success: false, error: message });
      }
    });

    // --- game:timeout -----------------------------------------------------
    socket.on('game:timeout', async (data, callback) => {
      const parsed = TimeoutEventSchema.safeParse(data);
      if (!parsed.success) {
        callback({ success: false, error: 'Invalid input' });
        return;
      }
      const { gameId } = parsed.data;

      const seat = socketGameMap.get(socket.id);
      if (!seat || seat.gameId !== gameId) {
        callback({ success: false, error: 'Not a participant in this game' });
        return;
      }

      try {
        await withGameLock(gameId, async () => {
          const game = await getGame(gameId);
          if (!game) {
            callback({ success: false, error: 'Game not found' });
            return;
          }

          const currentState = game.state as MatchState;
          const currentLeg = currentState.legs[currentState.currentLegIndex];
          const activePlayerIndex = currentLeg?.currentPlayerIndex ?? 0;

          if (seat.playerIndex !== activePlayerIndex) {
            callback({ success: false, error: 'Not your turn' });
            return;
          }

          const result = await handleGameTimeout(gameId, activePlayerIndex);
          io.to(`game:${gameId}`).emit('game:state', result.state);
          callback({ success: true });
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to handle timeout';
        socket.emit('game:error', { message });
        callback({ success: false, error: message });
      }
    });

    // --- game:reconnect ---------------------------------------------------
    socket.on('game:reconnect', async (callback) => {
      const user = socket.data.user as { userId: string; displayName: string } | undefined;
      if (!user) {
        callback({ success: false, error: 'Not authenticated' });
        return;
      }

      const conn = getConnection(user.userId);
      if (!conn || conn.disconnectedAt === null) {
        callback({ success: false, error: 'No active game to reconnect to' });
        return;
      }

      try {
        const game = await getGame(conn.gameId);
        if (!game || game.status === 'finished') {
          callback({ success: false, error: 'Game is no longer active' });
          return;
        }

        // Update the connection with the new socket
        updateConnectionSocket(user.userId, socket.id);

        // Re-join the game room and seat map
        socket.join(`game:${conn.gameId}`);
        socketGameMap.set(socket.id, { gameId: conn.gameId, playerIndex: conn.playerIndex });

        // Re-join the room channel if applicable
        if (conn.roomCode) {
          socket.join(`room:${conn.roomCode}`);
        }

        // Notify the opponent
        socket.to(`game:${conn.gameId}`).emit('game:opponent-reconnected');

        console.log(`Player reconnected: ${user.displayName} to game ${conn.gameId}`);

        callback({
          success: true,
          gameId: conn.gameId,
          state: game.state as MatchState,
          playerIndex: conn.playerIndex,
        });
      } catch {
        callback({ success: false, error: 'Failed to reconnect to game' });
      }
    });

    // --- disconnect -------------------------------------------------------
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);

      // Check if this socket was in a game with a registered connection
      const conn = getConnectionBySocketId(socket.id);
      if (conn) {
        markDisconnected(socket.id);
        // Notify the opponent that this player disconnected
        io.to(`game:${conn.gameId}`).emit('game:opponent-disconnected');
        console.log(`Player disconnected from game: userId=${conn.userId}, gameId=${conn.gameId}`);
      }

      socketGameMap.delete(socket.id);
    });
  });
}

/**
 * Join a socket to a game room with a specific player seat.
 * If the socket has an authenticated user, register the connection for reconnection support.
 */
export function joinGameRoom(socket: TypedSocket, gameId: string, playerIndex: 0 | 1, roomCode?: string | null): void {
  socket.join(`game:${gameId}`);
  socketGameMap.set(socket.id, { gameId, playerIndex });

  // Register connection for authenticated users to support reconnection
  const user = socket.data.user as { userId: string; displayName: string } | undefined;
  if (user) {
    registerConnection(user.userId, {
      socketId: socket.id,
      userId: user.userId,
      gameId,
      playerIndex,
      roomCode: roomCode ?? null,
      disconnectedAt: null,
    });
  }
}

/**
 * Leave a game room.
 */
export function leaveGameRoom(socket: TypedSocket, gameId: string): void {
  socket.leave(`game:${gameId}`);
  socketGameMap.delete(socket.id);
}

/**
 * Send the current game state to a specific socket.
 */
export async function sendGameState(socket: TypedSocket, gameId: string): Promise<void> {
  try {
    const game = await getGame(gameId);
    if (game) {
      socket.emit('game:state', game.state as MatchState);
    } else {
      socket.emit('game:error', { message: 'Game not found' });
    }
  } catch {
    socket.emit('game:error', { message: 'Failed to load game' });
  }
}
