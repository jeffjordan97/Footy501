import type { Server, Socket } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  RoomConfig,
} from '../types/socket-events.js';
import {
  createRoom,
  joinRoom,
  getRoom,
  removeRoom,
  findRoomBySocketId,
  removeGuestFromRoom,
  setRoomGameId,
  toRoomDetail,
} from '../services/room-service.js';
import {
  enqueue,
  dequeue,
  tryMatch,
} from '../services/matchmaking-service.js';
import { createGame } from '../services/game-service.js';
import { joinGameRoom } from './game-handler.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const MAX_PLAYER_NAME_LENGTH = 24;

function sanitizePlayerName(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .slice(0, MAX_PLAYER_NAME_LENGTH)
    .replace(/[<>"'&]/g, '') || 'Anonymous';
}

export function registerLobbyHandlers(io: TypedServer): void {
  io.on('connection', (socket: TypedSocket) => {
    // Set sanitized player name on socket data for downstream use
    socket.data.playerName = sanitizePlayerName(socket.handshake.auth?.playerName);

    // =========================================================================
    // Room events (room:*)
    // =========================================================================

    socket.on('room:create', async (data: { playerName: string; config: RoomConfig }, callback) => {
      try {
        const userId = (socket.data as Record<string, unknown>)?.userId as string | null ?? null;
        const room = createRoom(socket.id, userId, data.playerName, data.config);
        socket.join(`room:${room.code}`);

        callback({ success: true, roomCode: room.code, room: toRoomDetail(room) });
      } catch {
        callback({ success: false, error: 'Failed to create room' });
      }
    });

    socket.on('room:join', async (data: { code: string; playerName: string }, callback) => {
      try {
        const userId = (socket.data as Record<string, unknown>)?.userId as string | null ?? null;
        const room = joinRoom(data.code, socket.id, userId, data.playerName);

        if (!room) {
          callback({ success: false, error: 'Room not found or full' });
          return;
        }

        socket.join(`room:${room.code}`);

        // Notify the host that a guest joined
        io.to(`room:${room.code}`).emit('room:updated', { room: toRoomDetail(room) });

        // Create the game now that both players are present
        const gameResult = await createGame({
          ...room.config,
          player1Name: room.hostName,
          player2Name: data.playerName,
        });

        const updatedRoom = setRoomGameId(room.code, gameResult.gameId);

        // Join both sockets to the game room for real-time game events
        const hostSocket = io.sockets.sockets.get(room.hostSocketId);
        if (hostSocket) joinGameRoom(hostSocket as TypedSocket, gameResult.gameId, 0, room.code);
        joinGameRoom(socket as TypedSocket, gameResult.gameId, 1, room.code);

        const roomDetail = updatedRoom ? toRoomDetail(updatedRoom) : toRoomDetail(room);

        // Tell both players the game is starting
        io.to(`room:${room.code}`).emit('room:game-starting', {
          gameId: gameResult.gameId,
          state: gameResult.state,
          room: roomDetail,
        });

        callback({ success: true, room: roomDetail, gameId: gameResult.gameId });
      } catch {
        callback({ success: false, error: 'Failed to join room' });
      }
    });

    socket.on('room:leave', (data: { code: string }) => {
      const room = getRoom(data.code);
      if (!room) return;

      socket.leave(`room:${room.code}`);

      if (room.hostSocketId === socket.id) {
        // Host left - close the room
        io.to(`room:${room.code}`).emit('room:closed', { reason: 'Host left' });
        removeRoom(room.code);
      } else {
        // Guest left
        const updated = removeGuestFromRoom(room.code);
        if (updated) {
          io.to(`room:${room.code}`).emit('room:updated', { room: toRoomDetail(updated) });
        }
      }
    });

    // =========================================================================
    // Matchmaking events (matchmaking:*)
    // =========================================================================

    socket.on('matchmaking:join', (data: { playerName: string; config: RoomConfig }, callback) => {
      const userId = (socket.data as Record<string, unknown>)?.userId as string | null ?? null;

      enqueue({
        socketId: socket.id,
        userId,
        displayName: data.playerName,
        joinedAt: Date.now(),
      });

      // Try to match immediately
      const match = tryMatch(socket.id);
      if (match) {
        const [player1, player2] = match;

        // Create a room for the matched pair
        const room = createRoom(player1.socketId, player1.userId, player1.displayName, data.config);
        joinRoom(room.code, player2.socketId, player2.userId, player2.displayName);

        // Join both sockets to the room
        const p1Socket = io.sockets.sockets.get(player1.socketId);
        const p2Socket = io.sockets.sockets.get(player2.socketId);
        p1Socket?.join(`room:${room.code}`);
        p2Socket?.join(`room:${room.code}`);

        // Create the game
        createGame({
          ...data.config,
          player1Name: player1.displayName,
          player2Name: player2.displayName,
        })
          .then((gameResult) => {
            setRoomGameId(room.code, gameResult.gameId);

            // Join both to game room
            if (p1Socket) joinGameRoom(p1Socket as TypedSocket, gameResult.gameId, 0, room.code);
            if (p2Socket) joinGameRoom(p2Socket as TypedSocket, gameResult.gameId, 1, room.code);

            const currentRoom = getRoom(room.code);
            const roomDetail = currentRoom ? toRoomDetail(currentRoom) : toRoomDetail(room);

            // Notify player 1 with player 2 as opponent
            p1Socket?.emit('matchmaking:matched', {
              gameId: gameResult.gameId,
              state: gameResult.state,
              opponent: { name: player2.displayName },
              room: roomDetail,
            });

            // Notify player 2 with player 1 as opponent
            p2Socket?.emit('matchmaking:matched', {
              gameId: gameResult.gameId,
              state: gameResult.state,
              opponent: { name: player1.displayName },
              room: roomDetail,
            });
          })
          .catch((error: unknown) => {
            console.error('Failed to create matched game:', error);
            p1Socket?.emit('matchmaking:error', { message: 'Failed to create game' });
            p2Socket?.emit('matchmaking:error', { message: 'Failed to create game' });
          });
      }

      callback({ success: true, queued: !match });
    });

    socket.on('matchmaking:leave', (callback) => {
      dequeue(socket.id);
      callback({ success: true });
    });

    // =========================================================================
    // Disconnect
    // =========================================================================

    socket.on('disconnect', () => {
      // Matchmaking queue cleanup
      dequeue(socket.id);

      // Room cleanup
      const room = findRoomBySocketId(socket.id);
      if (room) {
        if (room.hostSocketId === socket.id && !room.gameId) {
          // Host disconnected before game started - close room
          io.to(`room:${room.code}`).emit('room:closed', { reason: 'Host disconnected' });
          removeRoom(room.code);
        } else if (room.guestSocketId === socket.id && !room.gameId) {
          // Guest disconnected before game started
          const updated = removeGuestFromRoom(room.code);
          if (updated) {
            io.to(`room:${room.code}`).emit('room:updated', { room: toRoomDetail(updated) });
          }
        }
        // If game already started, game-handler manages reconnection
      }
    });
  });
}
