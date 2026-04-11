import { db } from '../db/index.js';
import { teams } from '../db/schema/index.js';

export interface StatCategoryOption {
  readonly id: string;
  readonly name: string;
  readonly league: string;
  readonly leagueName: string;
  readonly teamId: string | null;
  readonly teamName: string | null;
  readonly statType: string;
}

/** Map league codes to human-readable display names. */
const LEAGUE_NAMES: Record<string, string> = {
  'GB1': 'Premier League',
  'ES1': 'La Liga',
  'L1': 'Bundesliga',
  'IT1': 'Serie A',
  'FR1': 'Ligue 1',
};

/** Stat types available for league-wide categories. */
const LEAGUE_STAT_TYPES = ['APPEARANCES', 'APPEARANCES_AND_GOALS'] as const;

/** Stat types available for per-team categories. */
const TEAM_STAT_TYPES = ['APPEARANCES'] as const;

/**
 * Get available stat categories based on what is in the database.
 * A category is a unique combination of league + team (optional) + stat type.
 *
 * Generates:
 *   - League-wide categories (appearances, goals) for each distinct league
 *   - Per-team categories (appearances) for each team within each league
 */
export async function getAvailableCategories(): Promise<readonly StatCategoryOption[]> {
  const allTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      league: teams.league,
    })
    .from(teams)
    .orderBy(teams.league, teams.name);

  const leagueMap = new Map<string, Array<{ id: string; name: string }>>();

  for (const team of allTeams) {
    const existing = leagueMap.get(team.league);
    if (existing) {
      existing.push({ id: team.id, name: team.name });
    } else {
      leagueMap.set(team.league, [{ id: team.id, name: team.name }]);
    }
  }

  const categories: StatCategoryOption[] = [];

  for (const [league, leagueTeams] of leagueMap) {
    const leagueName = LEAGUE_NAMES[league] ?? league;
    const leagueSlug = leagueName.toLowerCase().replace(/\s+/g, '-');

    // League-wide categories
    for (const statType of LEAGUE_STAT_TYPES) {
      const statSlug = statType.toLowerCase();
      categories.push({
        id: `${leagueSlug}-${statSlug}`,
        name: `${leagueName} ${formatStatType(statType)}`,
        league,
        leagueName,
        teamId: null,
        teamName: null,
        statType,
      });
    }

    // Per-team categories
    for (const team of leagueTeams) {
      const teamSlug = team.name.toLowerCase().replace(/\s+/g, '-');
      for (const statType of TEAM_STAT_TYPES) {
        const statSlug = statType.toLowerCase();
        categories.push({
          id: `${leagueSlug}-${teamSlug}-${statSlug}`,
          name: `${team.name} ${leagueName} ${formatStatType(statType)}`,
          league,
          leagueName,
          teamId: team.id,
          teamName: team.name,
          statType,
        });
      }
    }
  }

  return categories;
}

/**
 * Convert a stat type constant to a human-readable label.
 */
function formatStatType(statType: string): string {
  switch (statType) {
    case 'APPEARANCES':
      return 'Appearances';
    case 'GOALS':
      return 'Goals';
    case 'APPEARANCES_AND_GOALS':
      return 'Appearances & Goals';
    case 'APPEARANCES_AND_CLEAN_SHEETS':
      return 'Appearances & Clean Sheets';
    default:
      return statType;
  }
}
