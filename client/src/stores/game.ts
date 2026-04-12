import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import {
  createGame,
  getGame,
  getPlayersForCategory,
  submitAnswer,
  submitTimeout,
  type GameState,
  type PlayerWithStat,
  type CreateGameRequest,
} from '@/lib/api';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import type { MatchState, AnswerResult } from '@/types/socket-events';

export const useGameStore = defineStore('game', () => {
  // --- Core state ---

  const gameId = ref<string | null>(null);
  const state = ref<GameState | null>(null);
  const status = ref<'idle' | 'playing' | 'finished'>('idle');
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastTurnResult = ref<{
    result: string;
    statValue: number | null;
    bustMessage: string | null;
  } | null>(null);
  const categoryPlayers = ref<PlayerWithStat[]>([]);
  const player1Name = ref('Player 1');
  const player2Name = ref('Player 2');
  const categoryName = ref('');

  // --- WebSocket state ---

  const useWebSocket = ref(false);
  const wsConnected = ref(false);
  const opponentConnected = ref(true);
  let socketCleanup: (() => void) | null = null;

  // --- Private: category metadata for fetching players ---

  const _categoryLeague = ref('');
  const _categoryTeamId = ref<string | undefined>(undefined);
  const _categoryStatType = ref<string | undefined>(undefined);

  // --- Computed from GameState ---

  const currentLeg = computed(() => {
    if (!state.value) return null;
    return state.value.legs[state.value.currentLegIndex] ?? null;
  });

  const player1Score = computed(() => {
    if (!currentLeg.value) return 0;
    return currentLeg.value.players[0].score;
  });

  const player2Score = computed(() => {
    if (!currentLeg.value) return 0;
    return currentLeg.value.players[1].score;
  });

  const activePlayerIndex = computed<0 | 1>(() => {
    if (!currentLeg.value) return 0;
    return currentLeg.value.currentPlayerIndex;
  });

  const activePlayerName = computed(() =>
    activePlayerIndex.value === 0 ? player1Name.value : player2Name.value,
  );

  const legWins = computed<readonly [number, number]>(() => {
    if (!state.value) return [0, 0] as const;
    return state.value.legWins;
  });

  const matchFormat = computed(() => {
    if (!state.value) return 3;
    return state.value.config.matchFormat;
  });

  const turns = computed(() => {
    if (!currentLeg.value) return [];
    return currentLeg.value.turns;
  });

  const usedPlayerIds = computed<ReadonlySet<string>>(() => {
    if (!currentLeg.value) return new Set();
    const ids = currentLeg.value.usedPlayerIds;
    // Server returns usedPlayerIds as an object (keyed by player index), not an array
    if (Array.isArray(ids)) return new Set(ids);
    if (ids && typeof ids === 'object') return new Set(Object.values(ids).flat());
    return new Set();
  });

  const matchPhase = computed(() => {
    if (!state.value) return 'WAITING';
    return state.value.phase;
  });

  const legPhase = computed(() => {
    if (!currentLeg.value) return 'PLAYING';
    return currentLeg.value.phase;
  });

  const winner = computed<0 | 1 | null>(() => {
    if (!state.value) return null;
    return state.value.winner as 0 | 1 | null;
  });

  const targetScore = computed(() => {
    if (!state.value) return 501;
    return state.value.config.targetScore;
  });

  const currentLegNumber = computed(() => {
    if (!state.value) return 1;
    return state.value.currentLegIndex + 1;
  });

  const categoryLeague = computed(() => _categoryLeague.value);
  const categoryTeamId = computed(() => _categoryTeamId.value);
  const categoryStatType = computed(() => _categoryStatType.value);

  // --- Actions ---

  async function loadGame(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    lastTurnResult.value = null;

    try {
      const response = await getGame(id);
      gameId.value = id;
      state.value = response.state;
      status.value = response.state.phase === 'FINISHED' ? 'finished' : 'playing';

      // Extract category info and player names from the game config
      const config = response.state.config as Record<string, unknown>;
      const statCategory = config.statCategory as Record<string, unknown> | undefined;
      if (statCategory) {
        categoryName.value = (statCategory.name as string) ?? '';
        _categoryLeague.value = (statCategory.league as string) ?? '';
        _categoryTeamId.value = (statCategory.team as string | undefined) ?? undefined;
        _categoryStatType.value = (statCategory.statType as string | undefined) ?? undefined;
      }

      // Extract player names from the first leg
      const legs = response.state.legs as unknown as Array<{ players: Array<{ name: string }> }> | undefined;
      if (legs?.[0]?.players) {
        player1Name.value = legs[0].players[0]?.name ?? 'Player 1';
        player2Name.value = legs[0].players[1]?.name ?? 'Player 2';
      }

      // Fetch players for the category so the search works
      await loadCategoryPlayers();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load game';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createNewGame(config: CreateGameRequest): Promise<string> {
    loading.value = true;
    error.value = null;
    lastTurnResult.value = null;

    try {
      const response = await createGame(config);
      gameId.value = response.gameId;
      state.value = response.state;
      status.value = 'playing';
      player1Name.value = config.player1Name;
      player2Name.value = config.player2Name;
      categoryName.value = config.categoryName;
      _categoryLeague.value = config.league;
      _categoryTeamId.value = config.teamId;
      _categoryStatType.value = config.statType;

      // Fetch players for the category
      await loadCategoryPlayers();

      return response.gameId;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create game';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function loadCategoryPlayers(): Promise<void> {
    if (!_categoryLeague.value) return;
    try {
      const response = await getPlayersForCategory(
        _categoryLeague.value,
        _categoryTeamId.value,
        _categoryStatType.value,
      );
      categoryPlayers.value = response.players;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load category players';
    }
  }

  async function submitPlayerAnswer(
    footballerId: string,
    footballerName: string,
  ): Promise<void> {
    if (!gameId.value) throw new Error('No active game');
    error.value = null;

    if (useWebSocket.value) {
      const socket = getSocket();
      return new Promise<void>((resolve, reject) => {
        socket.emit(
          'game:submit-answer',
          { gameId: gameId.value!, footballerId, footballerName },
          (result) => {
            if (!result.success) {
              const errorMsg = result.error ?? 'Failed to submit answer';
              error.value = errorMsg;
              reject(new Error(errorMsg));
            } else {
              // State will be updated by the game:state / game:turn-result listeners
              resolve();
            }
          },
        );
      });
    }

    try {
      const response = await submitAnswer(
        gameId.value,
        activePlayerIndex.value,
        footballerId,
        footballerName,
      );
      state.value = response.state;
      lastTurnResult.value = {
        result: response.turnResult,
        statValue: response.statValue,
        bustMessage: response.bustMessage,
      };

      if (response.state.phase === 'FINISHED') {
        status.value = 'finished';
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to submit answer';
      throw err;
    }
  }

  async function handlePlayerTimeout(): Promise<void> {
    if (!gameId.value) throw new Error('No active game');
    error.value = null;

    if (useWebSocket.value) {
      const socket = getSocket();
      return new Promise<void>((resolve, reject) => {
        socket.emit(
          'game:timeout',
          { gameId: gameId.value! },
          (result) => {
            if (!result.success) {
              const errorMsg = result.error ?? 'Failed to submit timeout';
              error.value = errorMsg;
              reject(new Error(errorMsg));
            } else {
              // State will be updated by the game:state / game:turn-result listeners
              resolve();
            }
          },
        );
      });
    }

    try {
      const response = await submitTimeout(
        gameId.value,
        activePlayerIndex.value,
      );
      state.value = response.state;
      lastTurnResult.value = {
        result: 'TIMEOUT',
        statValue: null,
        bustMessage: null,
      };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to submit timeout';
      throw err;
    }
  }

  // --- WebSocket Actions ---

  /**
   * Applies a MatchState received via WebSocket to the store.
   * MatchState from the wire has usedPlayerIds as an array (JSON serialization
   * of ReadonlySet), which aligns with the client GameState shape.
   */
  function applyMatchState(matchState: MatchState): void {
    // Cast is safe: JSON-serialized MatchState matches GameState structure
    state.value = matchState as unknown as GameState;
    status.value = matchState.phase === 'FINISHED' ? 'finished' : 'playing';
  }

  function applyTurnResult(result: AnswerResult): void {
    applyMatchState(result.updatedState);
    lastTurnResult.value = {
      result: result.turnResult,
      statValue: result.scoreDeducted > 0 ? result.scoreDeducted : null,
      bustMessage: result.bustReason,
    };
  }

  /**
   * Connect to a game via WebSocket. Sets up listeners for real-time
   * state updates and error reporting from the server.
   */
  function connectToGame(id: string): void {
    gameId.value = id;
    useWebSocket.value = true;
    opponentConnected.value = true;

    const socket = connectSocket();

    const handleState = (matchState: MatchState) => {
      applyMatchState(matchState);
    };

    const handleTurnResult = (result: AnswerResult) => {
      applyTurnResult(result);
    };

    const handleError = (err: { message: string }) => {
      error.value = err.message;
    };

    const handleConnect = () => {
      wsConnected.value = true;
      // On reconnect, ask the server to restore our game session
      if (gameId.value) {
        socket.emit('game:reconnect', (result) => {
          if (result.success && result.state) {
            applyMatchState(result.state);
          }
        });
      }
    };

    const handleDisconnect = () => {
      wsConnected.value = false;
    };

    const handleOpponentDisconnected = () => {
      opponentConnected.value = false;
    };

    const handleOpponentReconnected = () => {
      opponentConnected.value = true;
    };

    socket.on('game:state', handleState);
    socket.on('game:turn-result', handleTurnResult);
    socket.on('game:error', handleError);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('game:opponent-disconnected', handleOpponentDisconnected);
    socket.on('game:opponent-reconnected', handleOpponentReconnected);

    wsConnected.value = socket.connected;

    socketCleanup = () => {
      socket.off('game:state', handleState);
      socket.off('game:turn-result', handleTurnResult);
      socket.off('game:error', handleError);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('game:opponent-disconnected', handleOpponentDisconnected);
      socket.off('game:opponent-reconnected', handleOpponentReconnected);
    };
  }

  /**
   * Disconnect from WebSocket and clean up all listeners.
   */
  function disconnectFromGame(): void {
    if (socketCleanup) {
      socketCleanup();
      socketCleanup = null;
    }
    disconnectSocket();
    useWebSocket.value = false;
    wsConnected.value = false;
    opponentConnected.value = true;
  }

  function reset(): void {
    disconnectFromGame();
    gameId.value = null;
    state.value = null;
    status.value = 'idle';
    loading.value = false;
    error.value = null;
    lastTurnResult.value = null;
    categoryPlayers.value = [];
    player1Name.value = 'Player 1';
    player2Name.value = 'Player 2';
    categoryName.value = '';
    _categoryLeague.value = '';
    _categoryTeamId.value = undefined;
    _categoryStatType.value = undefined;
  }

  return {
    // State
    gameId,
    state,
    status,
    loading,
    error,
    lastTurnResult,
    categoryPlayers,
    player1Name,
    player2Name,
    categoryName,
    useWebSocket,
    wsConnected,
    opponentConnected,

    // Computed
    player1Score,
    player2Score,
    activePlayerIndex,
    activePlayerName,
    legWins,
    matchFormat,
    turns,
    usedPlayerIds,
    matchPhase,
    legPhase,
    winner,
    targetScore,
    currentLegNumber,
    categoryLeague,
    categoryTeamId,
    categoryStatType,

    // Actions
    loadGame,
    createNewGame,
    loadCategoryPlayers,
    submitPlayerAnswer,
    handlePlayerTimeout,
    connectToGame,
    disconnectFromGame,
    reset,
  };
});
