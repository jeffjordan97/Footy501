import {
  pgTable,
  text,
  integer,
  boolean,
  date,
  timestamp,
  uuid,
  unique,
} from "drizzle-orm/pg-core";
import { games } from "./games.js";
import { users } from "./users.js";

/**
 * One daily challenge per day. Everyone plays the same category.
 */
export const dailyChallenges = pgTable("daily_challenges", {
  id: uuid().primaryKey().defaultRandom(),
  date: date().notNull().unique(),
  categoryId: text("category_id").notNull(),
  categoryName: text("category_name").notNull(),
  league: text().notNull(),
  leagueName: text("league_name").notNull(),
  teamId: text("team_id"),
  teamName: text("team_name"),
  statType: text("stat_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * One attempt per user per daily challenge.
 * Users are identified by user_id (authenticated) or display_name (guests).
 */
export const dailyChallengeAttempts = pgTable(
  "daily_challenge_attempts",
  {
    id: uuid().primaryKey().defaultRandom(),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => dailyChallenges.id),
    userId: uuid("user_id").references(() => users.id),
    displayName: text("display_name").notNull(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id),
    finalScore: integer("final_score"),
    turnsTaken: integer("turns_taken").notNull().default(0),
    completed: boolean().notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("uq_challenge_user").on(table.challengeId, table.userId),
    unique("uq_challenge_display_name").on(
      table.challengeId,
      table.displayName,
    ),
  ],
);
