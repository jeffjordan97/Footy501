import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";

export const players = pgTable(
  "players",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    normalizedName: text("normalized_name").notNull(),
    nationality: text(),
    position: text(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("players_normalized_name_idx").on(table.normalizedName),
    // For fuzzy search, enable pg_trgm extension and create a GIN trigram index:
    // CREATE INDEX players_normalized_name_trgm_idx ON players USING GIN (normalized_name gin_trgm_ops);
    // This should be done via a migration after enabling: CREATE EXTENSION IF NOT EXISTS pg_trgm;
  ],
);
