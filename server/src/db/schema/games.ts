import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import type { MatchConfig, MatchState } from "../../lib/game-engine/types.js";

export const games = pgTable("games", {
  id: uuid().primaryKey().defaultRandom(),
  status: text().notNull().$type<"waiting" | "playing" | "finished" | "abandoned">(),
  config: jsonb().$type<MatchConfig>(),
  state: jsonb().$type<MatchState>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
