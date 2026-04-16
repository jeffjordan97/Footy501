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
 * Search players by name within a specific category (league/team/statType).
 * Returns matching players with their stat values, ordered by stat descending.
 */
export async function searchPlayersInCategory(
  query: string,
  league: string,
  teamId?: string,
  statType?: string,
  limit = 15,
): Promise<readonly PlayerWithStat[]> {
  const pattern = `%${query}%`;
  const statExpression = buildStatExpression(statType);

  const conditions = [
    ilike(players.normalizedName, pattern),
    eq(teams.league, league),
  ];

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
    })
    .from(playerStats)
    .innerJoin(players, eq(playerStats.playerId, players.id))
    .innerJoin(teams, eq(playerStats.teamId, teams.id))
    .where(and(...conditions))
    .groupBy(players.id, players.name, players.nationality, players.position)
    .orderBy(sql`${statExpression} desc`)
    .limit(limit);

  return results.map((row) => ({
    ...row,
    teamName: '',
    statValue: Number(row.statValue),
  }));
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

// ---------------------------------------------------------------------------
// Season Hints
// ---------------------------------------------------------------------------

export interface SeasonInfo {
  readonly season: string;
  readonly playerCount: number;
}

export interface SeasonPlayer {
  readonly id: string;
  readonly name: string;
  readonly position: string | null;
  readonly statValue: number;
}

/**
 * Get distinct seasons that have player data for a given league (+ optional team).
 * Returns seasons sorted newest-first, with 'ALL' (2012-Present) at the top.
 */
export async function getDistinctSeasons(
  league: string,
  teamId?: string,
): Promise<readonly SeasonInfo[]> {
  const conditions = [eq(teams.league, league)];
  if (teamId) {
    conditions.push(eq(playerStats.teamId, teamId));
  }

  const results = await db
    .select({
      season: playerStats.season,
      playerCount: sql<number>`count(distinct ${playerStats.playerId})`,
    })
    .from(playerStats)
    .innerJoin(teams, eq(playerStats.teamId, teams.id))
    .where(and(...conditions))
    .groupBy(playerStats.season);

  return [...results]
    .map((r) => ({ season: r.season, playerCount: Number(r.playerCount) }))
    .sort((a, b) => {
      if (a.season === 'ALL') return -1;
      if (b.season === 'ALL') return 1;
      return b.season.localeCompare(a.season);
    });
}

/**
 * Get players for a specific season within a league (+ optional team/statType).
 * Returns a minimal response: id, name, position, stat value — ordered by stat desc.
 */
export async function getPlayersForSeason(
  season: string,
  league: string,
  teamId?: string,
  statType?: string,
): Promise<readonly SeasonPlayer[]> {
  const statExpression = buildStatExpression(statType);

  const conditions = [
    eq(teams.league, league),
    eq(playerStats.season, season),
  ];

  if (teamId) {
    conditions.push(eq(playerStats.teamId, teamId));
  }

  const results = await db
    .select({
      id: players.id,
      name: players.name,
      position: players.position,
      statValue: statExpression,
    })
    .from(playerStats)
    .innerJoin(players, eq(playerStats.playerId, players.id))
    .innerJoin(teams, eq(playerStats.teamId, teams.id))
    .where(and(...conditions))
    .groupBy(players.id, players.name, players.position)
    .orderBy(sql`${statExpression} desc`);

  return results.map((row) => ({
    ...row,
    statValue: Number(row.statValue),
  }));
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
    case 'APPEARANCES_AND_CLEAN_SHEETS':
      return sql<number>`sum(${playerStats.appearances} + ${playerStats.cleanSheets})`;
    case 'APPEARANCES':
    default:
      return sql<number>`sum(${playerStats.appearances})`;
  }
}
