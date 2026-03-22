import { db } from '../db/index.js';
import { players, playerStats, teams } from '../db/schema/index.js';
import { eq, ilike, sql, and } from 'drizzle-orm';

export interface PlayerSearchResult {
  readonly id: string;
  readonly name: string;
  readonly nationality: string | null;
  readonly position: string | null;
}

export interface PlayerWithStat {
  readonly id: string;
  readonly name: string;
  readonly nationality: string | null;
  readonly position: string | null;
  readonly statValue: number;
  readonly teamName: string;
}

/**
 * Fuzzy search players by name using ILIKE for partial matching.
 * e.g. "roon" matches "Wayne Rooney"
 */
export async function searchPlayers(
  query: string,
  limit = 10,
): Promise<readonly PlayerSearchResult[]> {
  const pattern = `%${query}%`;

  const results = await db
    .select({
      id: players.id,
      name: players.name,
      nationality: players.nationality,
      position: players.position,
    })
    .from(players)
    .where(ilike(players.normalizedName, pattern))
    .limit(limit);

  return results;
}

/**
 * Get a player's stat value for a specific category.
 * Sums the relevant stat column based on statType, filtered by league and optionally by team.
 */
export async function getPlayerStat(
  playerId: string,
  league: string,
  teamId?: string,
  statType?: string,
): Promise<number | null> {
  const statExpression = buildStatExpression(statType);

  const conditions = [
    eq(playerStats.playerId, playerId),
    eq(teams.league, league),
  ];

  if (teamId) {
    conditions.push(eq(playerStats.teamId, teamId));
  }

  const result = await db
    .select({
      total: statExpression,
    })
    .from(playerStats)
    .innerJoin(teams, eq(playerStats.teamId, teams.id))
    .where(and(...conditions));

  const row = result[0];
  if (!row || row.total === null) {
    return null;
  }

  return Number(row.total);
}

/**
 * Get players with their stats for a given category.
 * Returns players who have stats in the category, ordered by stat value descending.
 */
export async function getPlayersForCategory(
  league: string,
  teamId?: string,
  statType?: string,
  limit = 100,
): Promise<readonly PlayerWithStat[]> {
  const statExpression = buildStatExpression(statType);

  const conditions = [eq(teams.league, league)];

  if (teamId) {
    conditions.push(eq(playerStats.teamId, teamId));
  }

  const results = await db
    .select({
      id: players.id,
      name: players.name,
      nationality: players.nationality,
      position: players.position,
      statValue: statExpression,
      teamName: teams.name,
    })
    .from(playerStats)
    .innerJoin(players, eq(playerStats.playerId, players.id))
    .innerJoin(teams, eq(playerStats.teamId, teams.id))
    .where(and(...conditions))
    .groupBy(players.id, players.name, players.nationality, players.position, teams.name)
    .orderBy(sql`${statExpression} desc`)
    .limit(limit);

  return results.map((row) => ({
    ...row,
    statValue: Number(row.statValue),
  }));
}

/**
 * Get a single player by ID.
 */
export async function getPlayerById(
  playerId: string,
): Promise<PlayerSearchResult | null> {
  const results = await db
    .select({
      id: players.id,
      name: players.name,
      nationality: players.nationality,
      position: players.position,
    })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  return results[0] ?? null;
}

/**
 * Build a SQL expression for the stat value based on statType.
 */
function buildStatExpression(statType?: string) {
  switch (statType) {
    case 'GOALS':
      return sql<number>`sum(${playerStats.goals})`;
    case 'APPEARANCES_AND_GOALS':
      return sql<number>`sum(${playerStats.appearances} + ${playerStats.goals})`;
    case 'APPEARANCES_MINUS_GOALS':
      return sql<number>`sum(${playerStats.appearances} - ${playerStats.goals})`;
    case 'APPEARANCES_AND_CLEAN_SHEETS':
      return sql<number>`sum(${playerStats.appearances} + ${playerStats.cleanSheets})`;
    case 'APPEARANCES':
    default:
      return sql<number>`sum(${playerStats.appearances})`;
  }
}
