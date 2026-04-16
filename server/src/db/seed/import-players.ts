import "dotenv/config";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { db } from "../index.js";
import { players } from "../schema/players.js";
import { teams } from "../schema/teams.js";
import { playerStats } from "../schema/player-stats.js";
import { parseCSV } from "./parse-csv.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(import.meta.dirname, "../../../data");

const TOP_LEAGUE_IDS = new Set(["GB1", "ES1", "L1", "IT1", "FR1"]);

const LEAGUE_NAMES: Readonly<Record<string, string>> = {
  GB1: "Premier League",
  ES1: "La Liga",
  L1: "Bundesliga",
  IT1: "Serie A",
  FR1: "Ligue 1",
};

const BATCH_SIZE = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Remove diacritics / accents and lowercase the string.
 * e.g. "Mbappé" -> "mbappe", "Muller" -> "muller"
 */
function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Split an array into chunks of the given size.
 */
function chunk<T>(arr: readonly T[], size: number): readonly (readonly T[])[] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Read and parse a CSV file from the data directory.
 */
async function loadCSV(
  filename: string,
): Promise<readonly Record<string, string>[]> {
  const filePath = path.join(DATA_DIR, filename);
  if (!existsSync(filePath)) {
    throw new Error(
      `File not found: ${filePath}\nRun "pnpm db:download" first to fetch the dataset.`,
    );
  }
  const content = await readFile(filePath, "utf-8");
  return parseCSV(content);
}

// ---------------------------------------------------------------------------
// Aggregation types
// ---------------------------------------------------------------------------

interface AggregatedStat {
  readonly playerId: string;
  readonly clubId: string;
  readonly competitionId: string;
  readonly season: string;
  readonly appearances: number;
  readonly goals: number;
  readonly assists: number;
  readonly cleanSheets: number;
}

/**
 * Derive the football season string from a match date.
 * Football seasons span roughly Aug-May. Matches in Jan-Jul belong to
 * the season that started the previous year. Matches in Aug-Dec belong
 * to the season starting that year.
 * e.g. "2023-01-15" → "2022/23", "2023-09-01" → "2023/24"
 */
function dateToSeason(dateStr: string): string {
  const [yearStr, monthStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // Aug (8) onwards = new season starts this year
  const startYear = month >= 8 ? year : year - 1;
  const endYear = startYear + 1;
  return `${startYear}/${String(endYear).slice(-2)}`;
}

// ---------------------------------------------------------------------------
// Main seed logic
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("Footy 501 - Database Seeder");
  console.log("==============================\n");

  // 1. Load CSV data
  console.log("Loading CSV files...");
  const [playersCSV, appearancesCSV, clubsCSV] = await Promise.all([
    loadCSV("players.csv"),
    loadCSV("appearances.csv"),
    loadCSV("clubs.csv"),
  ]);
  console.log(`  players.csv:     ${playersCSV.length} rows`);
  console.log(`  appearances.csv: ${appearancesCSV.length} rows`);
  console.log(`  clubs.csv:       ${clubsCSV.length} rows`);

  // 2. Filter appearances to top 5 leagues
  console.log("\nFiltering to top 5 European leagues...");
  const filteredAppearances = appearancesCSV.filter((row) =>
    TOP_LEAGUE_IDS.has(row.competition_id),
  );
  console.log(`  Relevant appearances: ${filteredAppearances.length}`);

  // 3. Collect unique player IDs and club IDs from filtered appearances
  const relevantPlayerIds = new Set<string>();
  const relevantClubIds = new Set<string>();

  for (const row of filteredAppearances) {
    relevantPlayerIds.add(row.player_id);
    relevantClubIds.add(row.player_club_id);
  }

  console.log(`  Unique players: ${relevantPlayerIds.size}`);
  console.log(`  Unique clubs:   ${relevantClubIds.size}`);

  // 4. Aggregate appearances by player + club + competition
  console.log("\nAggregating player statistics...");

  const statsMap = new Map<string, AggregatedStat>();

  for (const row of filteredAppearances) {
    const season = row.date ? dateToSeason(row.date) : 'ALL';
    const key = `${row.player_id}|${row.player_club_id}|${row.competition_id}|${season}`;
    const existing = statsMap.get(key);

    const goals = parseInt(row.goals, 10) || 0;
    const assists = parseInt(row.assists, 10) || 0;

    if (existing) {
      statsMap.set(key, {
        ...existing,
        appearances: existing.appearances + 1,
        goals: existing.goals + goals,
        assists: existing.assists + assists,
      });
    } else {
      statsMap.set(key, {
        playerId: row.player_id,
        clubId: row.player_club_id,
        competitionId: row.competition_id,
        season,
        appearances: 1,
        goals,
        assists,
        cleanSheets: 0,
      });
    }
  }

  console.log(`  Aggregated stat entries: ${statsMap.size}`);

  // 5. Build club lookup from clubs.csv
  const clubLookup = new Map<string, Record<string, string>>();
  for (const club of clubsCSV) {
    clubLookup.set(club.club_id, club);
  }

  // 6. Build player lookup from players.csv
  const playerLookup = new Map<string, Record<string, string>>();
  for (const player of playersCSV) {
    playerLookup.set(player.player_id, player);
  }

  // 7. Insert teams
  console.log("\nInserting teams...");

  const teamRows = Array.from(relevantClubIds)
    .map((clubId) => {
      const club = clubLookup.get(clubId);
      if (!club) return null;

      // Determine the league from the club's appearances
      const leagueId = findPrimaryLeague(clubId, filteredAppearances);
      const league = leagueId ? (LEAGUE_NAMES[leagueId] ?? leagueId) : "Unknown";

      return {
        name: club.name || `Club ${clubId}`,
        league,
        country: club.domestic_competition_id
          ? leagueCountry(club.domestic_competition_id)
          : null,
      };
    })
    .filter(
      (row): row is { name: string; league: string; country: string | null } =>
        row !== null,
    );

  // Map from transfermarkt club_id to our UUID
  const teamIdMap = new Map<string, string>();
  const teamBatches = chunk(teamRows, BATCH_SIZE);

  for (const batch of teamBatches) {
    const inserted = await db
      .insert(teams)
      .values(batch as typeof teams.$inferInsert[])
      .onConflictDoNothing()
      .returning({ id: teams.id, name: teams.name });

    for (const row of inserted) {
      // Find the original club_id by name match
      const clubEntry = Array.from(relevantClubIds).find((cid) => {
        const club = clubLookup.get(cid);
        return club && club.name === row.name;
      });
      if (clubEntry) {
        teamIdMap.set(clubEntry, row.id);
      }
    }
  }

  console.log(`  Inserted ${teamIdMap.size} teams`);

  // 8. Insert players
  console.log("\nInserting players...");

  const playerRows = Array.from(relevantPlayerIds)
    .map((pid) => {
      const player = playerLookup.get(pid);
      if (!player) return null;

      const name = player.name || player.pretty_name || `Player ${pid}`;
      return {
        transfermarktId: pid,
        name,
        normalizedName: normalizeName(name),
        nationality: player.country_of_citizenship || null,
        position: mapPosition(player.position || player.sub_position || ""),
      };
    })
    .filter(
      (
        row,
      ): row is {
        transfermarktId: string;
        name: string;
        normalizedName: string;
        nationality: string | null;
        position: string | null;
      } => row !== null,
    );

  const playerIdMap = new Map<string, string>();
  const playerBatches = chunk(playerRows, BATCH_SIZE);

  for (const batch of playerBatches) {
    const insertValues = batch.map(({ transfermarktId: _, ...rest }) => rest);
    const inserted = await db
      .insert(players)
      .values(insertValues as typeof players.$inferInsert[])
      .onConflictDoNothing()
      .returning({ id: players.id, normalizedName: players.normalizedName });

    // Map back using normalizedName to transfermarktId
    for (const row of inserted) {
      const original = batch.find(
        (b) => b.normalizedName === row.normalizedName,
      );
      if (original) {
        playerIdMap.set(original.transfermarktId, row.id);
      }
    }
  }

  console.log(`  Inserted ${playerIdMap.size} players`);

  // 9. Insert player stats
  console.log("\nInserting player statistics...");

  const statRows = Array.from(statsMap.values())
    .map((stat) => {
      const dbPlayerId = playerIdMap.get(stat.playerId);
      const dbTeamId = teamIdMap.get(stat.clubId);

      if (!dbPlayerId || !dbTeamId) return null;

      return {
        playerId: dbPlayerId,
        teamId: dbTeamId,
        season: stat.season,
        statType: "APPEARANCES_AND_GOALS" as const,
        appearances: stat.appearances,
        goals: stat.goals,
        assists: stat.assists,
        cleanSheets: stat.cleanSheets,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const statBatches = chunk(statRows, BATCH_SIZE);
  let insertedStats = 0;

  for (const batch of statBatches) {
    const result = await db
      .insert(playerStats)
      .values(batch as typeof playerStats.$inferInsert[])
      .onConflictDoNothing()
      .returning({ id: playerStats.id });

    insertedStats += result.length;
  }

  console.log(`  Inserted ${insertedStats} stat entries`);

  // 10. Summary
  console.log("\n==============================");
  console.log("Seed complete!");
  console.log(`  Teams:        ${teamIdMap.size}`);
  console.log(`  Players:      ${playerIdMap.size}`);
  console.log(`  Stat entries: ${insertedStats}`);
  console.log("==============================\n");

  process.exit(0);
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Find the most common league for a given club from the appearances data.
 */
function findPrimaryLeague(
  clubId: string,
  appearances: readonly Record<string, string>[],
): string | null {
  const counts = new Map<string, number>();
  for (const row of appearances) {
    if (row.player_club_id === clubId) {
      const comp = row.competition_id;
      counts.set(comp, (counts.get(comp) ?? 0) + 1);
    }
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [comp, count] of counts) {
    if (count > bestCount) {
      best = comp;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Map competition_id to country name.
 */
function leagueCountry(competitionId: string): string | null {
  const mapping: Readonly<Record<string, string>> = {
    GB1: "England",
    ES1: "Spain",
    L1: "Germany",
    IT1: "Italy",
    FR1: "France",
  };
  return mapping[competitionId] ?? null;
}

/**
 * Map Transfermarkt position strings to simplified positions.
 */
function mapPosition(position: string): string | null {
  const lower = position.toLowerCase();
  if (lower.includes("goalkeeper") || lower.includes("keeper")) {
    return "Goalkeeper";
  }
  if (
    lower.includes("back") ||
    lower.includes("defender") ||
    lower.includes("centre-back") ||
    lower.includes("left-back") ||
    lower.includes("right-back")
  ) {
    return "Defender";
  }
  if (lower.includes("midfield") || lower.includes("midfielder")) {
    return "Midfielder";
  }
  if (
    lower.includes("forward") ||
    lower.includes("winger") ||
    lower.includes("striker") ||
    lower.includes("attack")
  ) {
    return "Forward";
  }
  return position || null;
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
