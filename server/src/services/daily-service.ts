import { db } from '../db/index.js';
import { dailyChallenges, dailyChallengeAttempts } from '../db/schema/index.js';
import { eq, and, desc, asc } from 'drizzle-orm';
import { getAvailableCategories } from './category-service.js';
import { createGame } from './game-service.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyChallenge {
  readonly id: string;
  readonly date: string;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly league: string;
  readonly leagueName: string;
  readonly teamId: string | null;
  readonly teamName: string | null;
  readonly statType: string;
}

export interface LeaderboardEntry {
  readonly rank: number;
  readonly displayName: string;
  readonly finalScore: number;
  readonly turnsTaken: number;
  readonly completed: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Well-known "big" clubs that casual football fans would recognise.
 * Only these teams (plus league-wide categories) are eligible for daily challenges.
 */
const DAILY_ELIGIBLE_TEAMS = new Set([
  // Premier League
  'Manchester United', 'Manchester City', 'Liverpool', 'Arsenal', 'Chelsea',
  'Tottenham Hotspur', 'Newcastle United', 'Aston Villa', 'West Ham United',
  'Everton', 'Leicester City', 'Leeds United',
  // La Liga
  'Real Madrid', 'Barcelona', 'Atletico Madrid', 'Sevilla', 'Valencia',
  'Real Betis', 'Villarreal', 'Real Sociedad', 'Athletic Bilbao',
  // Bundesliga
  'Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen',
  'Schalke 04', 'Eintracht Frankfurt', 'VfB Stuttgart', 'Borussia Mönchengladbach',
  // Serie A
  'Juventus', 'AC Milan', 'Inter Milan', 'AS Roma', 'Napoli', 'Lazio',
  'Fiorentina', 'Atalanta',
  // Ligue 1
  'Paris Saint-Germain', 'Olympique Marseille', 'Olympique Lyon', 'AS Monaco',
  'Lille', 'Nice',
]);

/**
 * Simple deterministic hash for seeding category selection from a date string.
 */
function hashDate(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function todayDateString(): string {
  return new Date().toISOString().split('T')[0] as string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get or create today's daily challenge.
 *
 * Uses a deterministic seed based on the date to pick a category so that all
 * server instances agree on the same challenge for a given day.
 */
export async function getTodayChallenge(): Promise<DailyChallenge> {
  const today = todayDateString();

  // Check if challenge already exists for today
  const existing = await db
    .select()
    .from(dailyChallenges)
    .where(eq(dailyChallenges.date, today))
    .limit(1);

  if (existing[0]) {
    return rowToChallenge(existing[0]);
  }

  // Generate a new challenge deterministically.
  // Filter to league-wide categories and well-known big clubs only,
  // so the daily challenge is accessible to casual football fans.
  const allCategories = await getAvailableCategories();
  const categories = allCategories.filter(
    (c) => c.teamName === null || DAILY_ELIGIBLE_TEAMS.has(c.teamName),
  );
  if (categories.length === 0) {
    throw new Error('No categories available to create daily challenge');
  }

  const seed = hashDate(today);
  const selectedCategory = categories[seed % categories.length]!;

  const [inserted] = await db
    .insert(dailyChallenges)
    .values({
      date: today,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      league: selectedCategory.league,
      leagueName: selectedCategory.leagueName,
      teamId: selectedCategory.teamId,
      teamName: selectedCategory.teamName,
      statType: selectedCategory.statType,
    })
    .onConflictDoNothing({ target: dailyChallenges.date })
    .returning();

  // If another process inserted first, read again
  if (!inserted) {
    const retry = await db
      .select()
      .from(dailyChallenges)
      .where(eq(dailyChallenges.date, today))
      .limit(1);

    if (!retry[0]) {
      throw new Error('Failed to create or retrieve daily challenge');
    }

    return rowToChallenge(retry[0]);
  }

  return rowToChallenge(inserted);
}

/**
 * Start a daily challenge attempt. Creates a solo game and records the attempt.
 * If the user already has an attempt, returns the existing one for resuming.
 */
export async function startDailyAttempt(
  challengeId: string,
  userId: string | null,
  displayName: string,
  player2Name?: string,
): Promise<{ readonly attemptId: string; readonly gameId: string; readonly state: import('../lib/game-engine/types.js').MatchState }> {
  // Check for existing attempt
  const existingResult = await findExistingAttempt(challengeId, userId, displayName);
  if (existingResult) {
    // Load the game state for resuming
    const { getGame } = await import('./game-service.js');
    const game = await getGame(existingResult.gameId);
    if (!game) {
      throw new Error('Game not found for existing attempt');
    }
    return {
      attemptId: existingResult.id,
      gameId: existingResult.gameId,
      state: game.state,
    };
  }

  // Load challenge to get category info
  const [challenge] = await db
    .select()
    .from(dailyChallenges)
    .where(eq(dailyChallenges.id, challengeId))
    .limit(1);

  if (!challenge) {
    throw new Error(`Daily challenge not found: ${challengeId}`);
  }

  // Create a solo game (single leg, target 501, no timer, no opponent)
  const { gameId, state } = await createGame({
    targetScore: 501,
    matchFormat: 1,
    enableBogeyNumbers: false,
    categoryId: challenge.categoryId,
    categoryName: challenge.categoryName,
    league: challenge.league,
    teamId: challenge.teamId ?? undefined,
    statType: challenge.statType,
    player1Name: displayName,
    player2Name: player2Name ?? 'Target',
  });

  // Record the attempt
  const [attempt] = await db
    .insert(dailyChallengeAttempts)
    .values({
      challengeId,
      userId,
      displayName,
      gameId,
    })
    .returning();

  if (!attempt) {
    throw new Error('Failed to create daily challenge attempt');
  }

  return { attemptId: attempt.id, gameId, state };
}

/**
 * Mark a daily challenge attempt as complete with server-derived score.
 * Finds the attempt by gameId to prevent spoofing. Returns true if an
 * attempt was updated, false if none matched (non-daily game — safe no-op).
 */
export async function completeDailyAttempt(
  gameId: string,
  finalScore: number,
  turnsTaken: number,
): Promise<boolean> {
  const [updated] = await db
    .update(dailyChallengeAttempts)
    .set({
      finalScore,
      turnsTaken,
      completed: true,
    })
    .where(eq(dailyChallengeAttempts.gameId, gameId))
    .returning({ id: dailyChallengeAttempts.id });

  return updated !== undefined;
}

/**
 * Get the leaderboard for a daily challenge.
 *
 * Ordering priority:
 *   1. Completed attempts first
 *   2. Lowest final score (closest to 0 = checked out)
 *   3. Fewest turns taken
 */
export async function getDailyLeaderboard(
  challengeId: string,
  limit = 20,
): Promise<readonly LeaderboardEntry[]> {
  const rows = await db
    .select({
      displayName: dailyChallengeAttempts.displayName,
      finalScore: dailyChallengeAttempts.finalScore,
      turnsTaken: dailyChallengeAttempts.turnsTaken,
      completed: dailyChallengeAttempts.completed,
    })
    .from(dailyChallengeAttempts)
    .where(
      and(
        eq(dailyChallengeAttempts.challengeId, challengeId),
        eq(dailyChallengeAttempts.completed, true),
      ),
    )
    .orderBy(
      asc(dailyChallengeAttempts.finalScore),
      asc(dailyChallengeAttempts.turnsTaken),
    )
    .limit(limit);

  return rows.map((row, index) => ({
    rank: index + 1,
    displayName: row.displayName,
    finalScore: row.finalScore ?? 0,
    turnsTaken: row.turnsTaken,
    completed: row.completed,
  }));
}

/**
 * Check if a user has already played a specific daily challenge.
 */
export async function hasPlayedToday(
  challengeId: string,
  userId: string | null,
  displayName: string,
): Promise<{ readonly played: boolean; readonly attemptId?: string; readonly gameId?: string }> {
  const existing = await findExistingAttempt(challengeId, userId, displayName);
  if (!existing) {
    return { played: false };
  }
  return {
    played: true,
    attemptId: existing.id,
    gameId: existing.gameId,
  };
}

/**
 * Get a daily challenge for a specific date (used by leaderboard).
 */
export async function getChallengeByDate(dateStr: string): Promise<DailyChallenge | null> {
  const [row] = await db
    .select()
    .from(dailyChallenges)
    .where(eq(dailyChallenges.date, dateStr))
    .limit(1);

  return row ? rowToChallenge(row) : null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function findExistingAttempt(
  challengeId: string,
  userId: string | null,
  displayName: string,
): Promise<{ readonly id: string; readonly gameId: string } | null> {
  // Prefer matching by userId if available, otherwise by displayName
  const condition = userId
    ? and(
        eq(dailyChallengeAttempts.challengeId, challengeId),
        eq(dailyChallengeAttempts.userId, userId),
      )
    : and(
        eq(dailyChallengeAttempts.challengeId, challengeId),
        eq(dailyChallengeAttempts.displayName, displayName),
      );

  const [existing] = await db
    .select({ id: dailyChallengeAttempts.id, gameId: dailyChallengeAttempts.gameId })
    .from(dailyChallengeAttempts)
    .where(condition)
    .limit(1);

  return existing ?? null;
}

function rowToChallenge(row: typeof dailyChallenges.$inferSelect): DailyChallenge {
  return {
    id: row.id,
    date: row.date,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    league: row.league,
    leagueName: row.leagueName,
    teamId: row.teamId,
    teamName: row.teamName,
    statType: row.statType,
  };
}
