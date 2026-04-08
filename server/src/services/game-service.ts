import { db } from '../db/index.js';
import { games, gameTurns } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { createMatch, submitAnswer, handleTimeout, getBustMessage } from '../lib/game-engine/index.js';
import type {
  MatchConfig,
  MatchState,
  MatchFormat,
  TargetScore,
  StatType,
  StatCategory,
  Turn,
} from '../lib/game-engine/index.js';
import { getPlayerStat } from './player-service.js';
import { randomUUID } from 'node:crypto';

export interface CreateGameParams {
  readonly targetScore: number;
  readonly matchFormat: number;
  readonly timerDuration: number;
  readonly enableBogeyNumbers: boolean;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly league: string;
  readonly teamId?: string;
  readonly statType: string;
  readonly player1Name: string;
  readonly player2Name: string;
}

export interface GameAnswerResult {
  readonly state: MatchState;
  readonly turnResult: string;
  readonly statValue: number | null;
  readonly bustMessage: string | null;
}

export interface GameTurnRecord {
  readonly id: string;
  readonly gameId: string;
  readonly legNumber: number;
  readonly playerIndex: number;
  readonly footballerName: string | null;
  readonly statValue: number | null;
  readonly result: string;
  readonly scoreAfter: number;
  readonly createdAt: Date;
}

/**
 * Create a new game, persist to database, return game ID and initial state.
 */
export async function createGame(
  config: CreateGameParams,
): Promise<{ readonly gameId: string; readonly state: MatchState }> {
  const matchId = randomUUID();

  const statCategory: StatCategory = {
    id: config.categoryId,
    name: config.categoryName,
    league: config.league,
    team: config.teamId ?? null,
    statType: config.statType as StatType,
  };

  const matchConfig: MatchConfig = {
    id: matchId,
    targetScore: config.targetScore as TargetScore,
    statCategory,
    matchFormat: config.matchFormat as MatchFormat,
    timerDuration: config.timerDuration,
    enableBogeyNumbers: config.enableBogeyNumbers,
    tiebreakerTarget: 101,
  };

  const state = createMatch(matchConfig);

  const [inserted] = await db
    .insert(games)
    .values({
      status: 'playing',
      config: matchConfig,
      state,
    })
    .returning({ id: games.id });

  if (!inserted) {
    throw new Error('Failed to create game record');
  }

  return { gameId: inserted.id, state: serializeState(state) as unknown as MatchState };
}

/**
 * Submit an answer for a game turn.
 *
 * 1. Load game state from database
 * 2. Look up the footballer's stat value
 * 3. Run through the game engine
 * 4. Persist updated state
 * 5. Record the turn
 * 6. Return updated state and turn info
 */
export async function submitGameAnswer(
  gameId: string,
  playerIndex: 0 | 1,
  footballerId: string,
  footballerName: string,
): Promise<GameAnswerResult> {
  const game = await loadGameOrThrow(gameId);
  const currentState = game.state as MatchState;

  // Look up stat value for the footballer in this game's category
  const category = currentState.config.statCategory;
  const statValue = await getPlayerStat(
    footballerId,
    category.league,
    category.team ?? undefined,
    category.statType,
  );

  const resolvedStatValue = statValue ?? 0;

  // Capture current player score before engine processes the turn
  const preTurnLeg = currentState.legs[currentState.currentLegIndex];
  const preTurnScore = preTurnLeg?.players[playerIndex]?.score ?? 0;

  // Run through engine
  const updatedState = submitAnswer(
    currentState,
    playerIndex,
    footballerId,
    footballerName,
    resolvedStatValue,
  );

  // Determine turn result from the last turn added
  const currentLeg = updatedState.legs[updatedState.currentLegIndex];
  const lastTurn: Turn | undefined = currentLeg
    ? currentLeg.turns[currentLeg.turns.length - 1]
    : undefined;

  const turnResult = lastTurn?.result ?? 'VALID';
  const scoreAfter = lastTurn?.scoreAfter ?? 0;

  const bustMessage = getBustMessage(turnResult, resolvedStatValue, preTurnScore);

  // Determine new game status
  const newStatus = updatedState.phase === 'FINISHED' ? 'finished' as const : 'playing' as const;

  // Persist updated state
  await db
    .update(games)
    .set({ state: updatedState, status: newStatus })
    .where(eq(games.id, gameId));

  // Record turn
  const legNumber = currentLeg?.legNumber ?? 1;
  await db.insert(gameTurns).values({
    gameId,
    legNumber,
    playerIndex,
    footballerName,
    statValue: resolvedStatValue,
    result: turnResult,
    scoreAfter,
  });

  return {
    state: serializeState(updatedState) as unknown as MatchState,
    turnResult,
    statValue,
    bustMessage,
  };
}

/**
 * Handle a timeout for a game turn.
 */
export async function handleGameTimeout(
  gameId: string,
  playerIndex: 0 | 1,
): Promise<{ readonly state: MatchState }> {
  const game = await loadGameOrThrow(gameId);
  const currentState = game.state as MatchState;

  const updatedState = handleTimeout(currentState, playerIndex);

  const currentLeg = updatedState.legs[updatedState.currentLegIndex];
  const lastTurn: Turn | undefined = currentLeg
    ? currentLeg.turns[currentLeg.turns.length - 1]
    : undefined;

  const newStatus = updatedState.phase === 'FINISHED' ? 'finished' as const : 'playing' as const;

  await db
    .update(games)
    .set({ state: updatedState, status: newStatus })
    .where(eq(games.id, gameId));

  await db.insert(gameTurns).values({
    gameId,
    legNumber: currentLeg?.legNumber ?? 1,
    playerIndex,
    footballerName: null,
    statValue: null,
    result: 'TIMEOUT',
    scoreAfter: lastTurn?.scoreAfter ?? 0,
  });

  return { state: serializeState(updatedState) as unknown as MatchState };
}

/**
 * Get game state by ID.
 */
export async function getGame(
  gameId: string,
): Promise<{ readonly state: MatchState; readonly status: string } | null> {
  const results = await db
    .select({
      state: games.state,
      status: games.status,
    })
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);

  const row = results[0];
  if (!row || !row.state) {
    return null;
  }

  return {
    state: serializeState(row.state as MatchState) as unknown as MatchState,
    status: row.status,
  };
}

/**
 * Serialize a MatchState for JSON responses.
 *
 * Converts Set instances (usedPlayerIds) to arrays so JSON.stringify
 * produces iterable data the client can reconstruct.
 */
function serializeState(state: MatchState): Record<string, unknown> {
  return {
    ...state,
    legs: state.legs.map((leg) => {
      const ids = leg.usedPlayerIds;
      let serializedIds: string[];
      if (ids instanceof Set) {
        serializedIds = [...ids];
      } else if (Array.isArray(ids)) {
        serializedIds = ids;
      } else if (ids && typeof ids === 'object') {
        // JSONB stores Set as plain object with numeric keys
        serializedIds = Object.values(ids as unknown as Record<string, string>).flat();
      } else {
        serializedIds = [];
      }
      return { ...leg, usedPlayerIds: serializedIds };
    }),
  };
}

/**
 * Hydrate a MatchState loaded from JSONB.
 *
 * JSON serialization does not support Set, so usedPlayerIds is stored as a
 * plain object/array. This function converts it back to a Set for each leg.
 */
function hydrateMatchState(state: MatchState): MatchState {
  return {
    ...state,
    legs: state.legs.map((leg) => ({
      ...leg,
      usedPlayerIds: new Set<string>(
        leg.usedPlayerIds instanceof Set
          ? [...leg.usedPlayerIds]
          : Object.keys(leg.usedPlayerIds as unknown as Record<string, unknown>),
      ),
    })),
  };
}

/**
 * Load a game from the database or throw if not found.
 */
async function loadGameOrThrow(gameId: string) {
  const results = await db
    .select()
    .from(games)
    .where(eq(games.id, gameId))
    .limit(1);

  const game = results[0];
  if (!game || !game.state) {
    throw new Error(`Game not found: ${gameId}`);
  }

  return {
    ...game,
    state: hydrateMatchState(game.state as MatchState),
  };
}
