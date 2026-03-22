import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { games } from "./games.js";

export const gameTurns = pgTable("game_turns", {
  id: uuid().primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id),
  legNumber: integer("leg_number").notNull(),
  playerIndex: integer("player_index").notNull(),
  footballerName: text("footballer_name"),
  statValue: integer("stat_value"),
  result: text().notNull(),
  scoreAfter: integer("score_after").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
