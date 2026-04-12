// ============================================================================
// Socket.IO event type definitions (previously from @footy501/shared)
// ============================================================================

// --- Match state types (mirror of server game-engine types) ---

export interface MatchState {
  readonly phase: string;
  readonly currentLegIndex: number;
  readonly legWins: readonly [number, number];
  readonly winner: 0 | 1 | null;
  readonly config: {
    readonly targetScore: number;
    readonly matchFormat: number;
  };
  readonly legs: readonly LegState[];
}

export interface LegState {
  readonly phase: string;
  readonly currentPlayerIndex: 0 | 1;
  readonly players: readonly LegPlayerState[];
  readonly turns: readonly TurnEntry[];
  readonly usedPlayerIds: readonly string[];
}

export interface LegPlayerState {
  readonly score: number;
}

export interface TurnEntry {
  readonly playerIndex: 0 | 1;
  readonly footballerName: string | null;
  readonly statValue: number | null;
  readonly scoreAfter: number;
  readonly result: string;
}

export interface AnswerResult {
  readonly success: boolean;
  readonly turnResult: string;
  readonly bustReason: string | null;
  readonly scoreDeducted: number;
  readonly newScore: number;
  readonly isCheckout: boolean;
  readonly updatedState: MatchState;
}

// --- Room / Lobby types ---

export interface RoomConfig {
  readonly targetScore: number;
  readonly matchFormat: number;
  readonly enableBogeyNumbers: boolean;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly league: string;
  readonly teamId?: string;
  readonly statType: string;
}

export interface RoomDetail {
  readonly code: string;
  readonly hostName: string;
  readonly guestName: string | null;
  readonly gameId: string | null;
  readonly config: RoomConfig;
  readonly status: 'waiting' | 'ready' | 'playing' | 'finished';
  readonly createdAt: number;
}

export interface LobbyPlayer {
  readonly id: string;
  readonly name: string;
  readonly status: 'available' | 'in-game' | 'idle';
}

export interface RoomInfo {
  readonly code: string;
  readonly hostName: string;
  readonly playerCount: number;
}

export interface ChallengeInfo {
  readonly id: string;
  readonly fromPlayerId: string;
  readonly fromPlayerName: string;
}

// --- Socket event maps ---

export interface ServerToClientEvents {
  // Legacy lobby events
  'lobby:players': (players: readonly LobbyPlayer[]) => void;
  'lobby:player-joined': (player: LobbyPlayer) => void;
  'lobby:player-left': (playerId: string) => void;
  'lobby:room-created': (room: RoomInfo) => void;
  'lobby:room-joined': (room: RoomInfo) => void;
  'lobby:challenge-received': (challenge: ChallengeInfo) => void;
  'lobby:match-found': (gameId: string) => void;

  // Room events
  'room:updated': (data: { room: RoomDetail }) => void;
  'room:closed': (data: { reason: string }) => void;
  'room:game-starting': (data: { gameId: string; state: MatchState; room: RoomDetail }) => void;

  // Matchmaking events
  'matchmaking:matched': (data: {
    gameId: string;
    state: MatchState;
    opponent: { name: string };
    room: RoomDetail;
  }) => void;
  'matchmaking:error': (data: { message: string }) => void;

  // Game events
  'game:state': (state: MatchState) => void;
  'game:turn-result': (data: AnswerResult) => void;
  'game:error': (data: { message: string }) => void;
  'game:opponent-disconnected': () => void;
  'game:opponent-reconnected': () => void;
}

export interface ClientToServerEvents {
  // Legacy lobby events
  'lobby:join': (playerName: string) => void;
  'lobby:leave': () => void;
  'lobby:quick-match': () => void;
  'lobby:cancel-quick-match': () => void;
  'lobby:create-room': (config: Record<string, unknown>) => void;
  'lobby:join-room': (roomCode: string) => void;
  'lobby:challenge': (targetPlayerId: string) => void;
  'lobby:accept-challenge': (challengeId: string) => void;
  'lobby:decline-challenge': (challengeId: string) => void;

  // Room events
  'room:create': (
    data: { playerName: string; config: RoomConfig },
    callback: (result: { success: boolean; roomCode?: string; room?: RoomDetail; error?: string }) => void,
  ) => void;
  'room:join': (
    data: { code: string; playerName: string },
    callback: (result: { success: boolean; room?: RoomDetail; gameId?: string; error?: string }) => void,
  ) => void;
  'room:leave': (data: { code: string }) => void;

  // Matchmaking events
  'matchmaking:join': (
    data: { playerName: string; config: RoomConfig },
    callback: (result: { success: boolean; queued?: boolean }) => void,
  ) => void;
  'matchmaking:leave': (callback: (result: { success: boolean }) => void) => void;

  // Game events
  'game:submit-answer': (
    data: { gameId: string; footballerId: string; footballerName: string },
    callback: (result: { success: boolean; error?: string }) => void,
  ) => void;
  'game:timeout': (
    data: { gameId: string },
    callback: (result: { success: boolean; error?: string }) => void,
  ) => void;
  'game:reconnect': (
    callback: (result: { success: boolean; gameId?: string; state?: MatchState; playerIndex?: 0 | 1; error?: string }) => void,
  ) => void;
}
