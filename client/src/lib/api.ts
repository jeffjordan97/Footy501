export const API_BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`;

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('footy501_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...options?.headers },
    ...options,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error ?? `Request failed: ${response.status}`);
  }
  return response.json();
}

// Player APIs
export async function getPlayersForCategory(
  league: string,
  teamId?: string,
  statType?: string,
  limit = 100,
) {
  const params = new URLSearchParams({ league, limit: String(limit) });
  if (teamId) params.set('teamId', teamId);
  if (statType) params.set('statType', statType);
  return request<{ players: PlayerWithStat[] }>(`/players/category?${params}`);
}

export async function searchPlayersInCategory(
  query: string,
  league: string,
  teamId?: string,
  statType?: string,
  limit = 15,
) {
  const params = new URLSearchParams({ q: query, league, limit: String(limit) });
  if (teamId) params.set('teamId', teamId);
  if (statType) params.set('statType', statType);
  return request<{ players: PlayerWithStat[] }>(`/players/search-category?${params}`);
}

// Category APIs
export async function getCategories() {
  return request<{ categories: StatCategoryOption[] }>('/categories');
}

// Game APIs
export async function createGame(config: CreateGameRequest) {
  return request<{ gameId: string; state: GameState }>('/games', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function getGame(gameId: string) {
  return request<{ state: GameState; status: string }>(`/games/${gameId}`);
}

export async function submitAnswer(
  gameId: string,
  playerIndex: 0 | 1,
  footballerId: string,
  footballerName: string,
) {
  return request<{
    state: GameState;
    turnResult: string;
    statValue: number | null;
    bustMessage: string | null;
  }>(`/games/${gameId}/answer`, {
    method: 'POST',
    body: JSON.stringify({ playerIndex, footballerId, footballerName }),
  });
}

export async function submitTimeout(gameId: string, playerIndex: 0 | 1) {
  return request<{ state: GameState }>(`/games/${gameId}/timeout`, {
    method: 'POST',
    body: JSON.stringify({ playerIndex }),
  });
}

// Daily challenge APIs

export interface DailyChallenge {
  readonly id: string;
  readonly date: string;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly league: string;
  readonly teamId: string | null;
  readonly teamName: string | null;
  readonly statType: string;
}

export interface DailyLeaderboardEntry {
  readonly rank: number;
  readonly displayName: string;
  readonly finalScore: number;
  readonly turnsTaken: number;
}

export async function getDailyChallenge() {
  return request<{ challenge: DailyChallenge }>('/daily/today');
}

export async function startDailyAttempt(displayName: string, guestId?: string, player2Name?: string) {
  return request<{ gameId: string; alreadyPlayed: boolean }>('/daily/start', {
    method: 'POST',
    body: JSON.stringify({ displayName, guestId, player2Name }),
  });
}

export async function completeDailyAttempt(gameId: string) {
  return request<{ success: boolean }>('/daily/complete', {
    method: 'POST',
    body: JSON.stringify({ gameId }),
  });
}

export async function getDailyLeaderboard() {
  return request<{ entries: DailyLeaderboardEntry[] }>('/daily/leaderboard');
}

// Auth APIs
export async function getAuthProviders() {
  return request<{ providers: { google: boolean; guest: boolean } }>('/auth/providers');
}

// Types

/** Opaque server-side match state -- structured fields accessed via store computed properties */
export interface GameState {
  readonly phase: string;
  readonly currentLegIndex: number;
  readonly legWins: readonly [number, number];
  readonly winner: number | null;
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

export interface PlayerWithStat {
  readonly id: string;
  readonly name: string;
  readonly nationality: string | null;
  readonly position: string | null;
  readonly statValue: number;
  readonly teamName: string;
}

export interface StatCategoryOption {
  readonly id: string;
  readonly name: string;
  readonly league: string;
  readonly leagueName: string;
  readonly teamId: string | null;
  readonly teamName: string | null;
  readonly statType: string;
}

export interface CreateGameRequest {
  readonly targetScore: number;
  readonly matchFormat: number;
  readonly enableBogeyNumbers: boolean;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly league: string;
  readonly teamId?: string;
  readonly statType: string;
  readonly player1Name: string;
  readonly player2Name: string;
}
