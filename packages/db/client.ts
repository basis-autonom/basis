import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;
type SqlClient = ReturnType<typeof postgres>;

const globalForBasisDb = globalThis as typeof globalThis & {
  __basisDb?: Database;
  __basisSql?: SqlClient;
};

export function getDb(): Database {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required for findings storage. Configure a Neon or Supabase Postgres connection string.",
    );
  }

  if (!globalForBasisDb.__basisDb) {
    const sql = postgres(connectionString, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
    globalForBasisDb.__basisSql = sql;
    globalForBasisDb.__basisDb = drizzle(sql, { schema });
  }

  return globalForBasisDb.__basisDb;
}
