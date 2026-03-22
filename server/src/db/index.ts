import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const requiresSsl = connectionString.includes("sslmode=require") || process.env.NODE_ENV === "production";

const client = postgres(connectionString, {
  ssl: requiresSsl ? "require" : false,
});
export const db = drizzle(client, { schema });
export type Database = typeof db;
