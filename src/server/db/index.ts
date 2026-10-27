import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __shopBonusPool?: Pool;
};

export const pool =
  globalForDb.__shopBonusPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 5000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__shopBonusPool = pool;
}

export const db = drizzle(pool);
