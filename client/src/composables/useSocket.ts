import { ref, onMounted, onUnmounted } from 'vue';
import { connectSocket, disconnectSocket, getSocket, type TypedSocket } from '@/lib/socket';
import type { ServerToClientEvents, RoomConfig, RoomDetail, MatchState } from '@/types/socket-events';

export function useSocket() {
  const isConnected = ref(false);

  // Always resolve the current socket instance (may change after reconnect with new auth)
  const s = () => getSocket();

  const updateConnectionStatus = () => {
    isConnected.value = s().connected;
  };

  const bindConnectionListeners = (socket: TypedSocket) => {
    socket.on('connect', updateConnectionStatus);
    socket.on('disconnect', updateConnectionStatus);
  };

  const unbindConnectionListeners = (socket: TypedSocket) => {
    socket.off('connect', updateConnectionStatus);
    socket.off('disconnect', updateConnectionStatus);
  };

  // Track the socket instance we've bound listeners to so we can clean up
  let boundSocket: TypedSocket | null = null;

  const connect = (authToken?: string) => {
    // Unbind from the old socket if it's being replaced
    if (boundSocket) {
      unbindConnectionListeners(boundSocket);
    }
    connectSocket(authToken);
    // Bind to the (potentially new) socket
    boundSocket = s();
    bindConnectionListeners(boundSocket);
    updateConnectionStatus();
  };

  const disconnect = () => {
    disconnectSocket();
  };

  // --- Generic event helpers ---

  type EventName = keyof ServerToClientEvents;
  type EventHandler<E extends EventName> = ServerToClientEvents[E];

  const listeners: Array<{ event: string; handler: (...args: unknown[]) => void }> = [];

  const on = <E extends EventName>(event: E, handler: EventHandler<E>) => {
    s().on(event, handler as never);
    listeners.push({ event, handler: handler as (...args: unknown[]) => void });
  };

  const off = <E extends EventName>(event: E, handler: EventHandler<E>) => {
    s().off(event, handler as never);
  };

  // --- Game-specific emitters ---

  function submitAnswer(
    gameId: string,
    footballerId: string,
    footballerName: string,
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      s().emit(
        'game:submit-answer',
        { gameId, footballerId, footballerName },
        (result) => resolve(result),
      );
    });
  }

  function sendTimeout(
    gameId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      s().emit(
        'game:timeout',
        { gameId },
        (result) => resolve(result),
      );
    });
  }

  // --- Reconnection emitter ---

  function reconnectToGame(): Promise<{
    success: boolean;
    gameId?: string;
    state?: MatchState;
    playerIndex?: 0 | 1;
    error?: string;
  }> {
    return new Promise((resolve) => {
      s().emit('game:reconnect', (result) => resolve(result));
    });
  }

  // --- Opponent status listeners ---

  function onOpponentDisconnected(callback: () => void): void {
    on('game:opponent-disconnected', callback);
  }

  function onOpponentReconnected(callback: () => void): void {
    on('game:opponent-reconnected', callback);
  }

  // --- Room emitters ---

  function createRoom(
    playerName: string,
    config: RoomConfig,
  ): Promise<{ success: boolean; roomCode?: string; room?: RoomDetail; error?: string }> {
    return new Promise((resolve) => {
      s().emit('room:create', { playerName, config }, resolve);
    });
  }

  function joinRoom(
    code: string,
    playerName: string,
  ): Promise<{ success: boolean; room?: RoomDetail; gameId?: string; error?: string }> {
    return new Promise((resolve) => {
      s().emit('room:join', { code, playerName }, resolve);
    });
  }

  function leaveRoom(code: string): void {
    s().emit('room:leave', { code });
  }

  // --- Matchmaking emitters ---

  function joinMatchmaking(
    playerName: string,
    config: RoomConfig,
  ): Promise<{ success: boolean; queued?: boolean }> {
    return new Promise((resolve) => {
      s().emit('matchmaking:join', { playerName, config }, resolve);
    });
  }

  function leaveMatchmaking(): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
      s().emit('matchmaking:leave', resolve);
    });
  }

  // --- Room/Matchmaking event listeners ---

  function onRoomUpdated(callback: (data: { room: RoomDetail }) => void): void {
    on('room:updated', callback);
  }

  function onRoomClosed(callback: (data: { reason: string }) => void): void {
    on('room:closed', callback);
  }

  function onRoomGameStarting(
    callback: (data: { gameId: string; state: MatchState; room: RoomDetail }) => void,
  ): void {
    on('room:game-starting', callback);
  }

  function onMatchmakingMatched(
    callback: (data: {
      gameId: string;
      state: MatchState;
      opponent: { name: string };
      room: RoomDetail;
    }) => void,
  ): void {
    on('matchmaking:matched', callback);
  }

  function onMatchmakingError(callback: (data: { message: string }) => void): void {
    on('matchmaking:error', callback);
  }

  // --- Lifecycle ---

  onMounted(() => {
    boundSocket = s();
    bindConnectionListeners(boundSocket);
    updateConnectionStatus();
  });

  onUnmounted(() => {
    const current = s();
    for (const { event, handler } of listeners) {
      current.off(event as never, handler as never);
    }
    listeners.length = 0;
    if (boundSocket) {
      unbindConnectionListeners(boundSocket);
      boundSocket = null;
    }
  });

  return {
    isConnected,
    connect,
    disconnect,
    on,
    off,
    submitAnswer,
    sendTimeout,
    reconnectToGame,
    onOpponentDisconnected,
    onOpponentReconnected,
    createRoom,
    joinRoom,
    leaveRoom,
    joinMatchmaking,
    leaveMatchmaking,
    onRoomUpdated,
    onRoomClosed,
    onRoomGameStarting,
    onMatchmakingMatched,
    onMatchmakingError,
  };
}
