import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const teams = pgTable("teams", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  league: text().notNull(),
  country: text(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
