import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  unique,
} from "drizzle-orm/pg-core";
import { players } from "./players.js";
import { teams } from "./teams.js";

export const playerStats = pgTable(
  "player_stats",
  {
    id: uuid().primaryKey().defaultRandom(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id),
    season: text().notNull(),
    statType: text("stat_type").notNull(),
    appearances: integer().notNull().default(0),
    goals: integer().notNull().default(0),
    assists: integer().notNull().default(0),
    cleanSheets: integer("clean_sheets").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("player_stats_unique").on(
      table.playerId,
      table.teamId,
      table.season,
      table.statType,
    ),
  ],
);
