import { fileURLToPath } from "node:url";
import { closeDb } from "../packages/db/client";
import { deleteFindingsForReportedDay } from "../packages/db/findings";

const PRODUCTION_DATABASE_HOSTS = new Set([
  "ep-cold-credit-b4uxeddf-pooler.c-6.us-east-2.aws.neon.tech",
]);
const PRODUCTION_OVERRIDE_FLAG = "--i-know-what-im-doing";

function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function main() {
  // This is deliberately a local CLI, not an API route. Never allow it in a
  // production process or on Vercel, even if the flag is copied accidentally.
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    throw new Error("The findings reset tool is disabled in production.");
  }
  if (process.env.FINDINGS_RESET_TODAY !== "true") {
    throw new Error("Set FINDINGS_RESET_TODAY=true to confirm this local reset.");
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for the findings reset tool.");
  }

  let databaseHost: string;
  try {
    databaseHost = new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error("DATABASE_URL is not a valid Postgres URL.");
  }

  if (
    PRODUCTION_DATABASE_HOSTS.has(databaseHost) &&
    !process.argv.includes(PRODUCTION_OVERRIDE_FLAG)
  ) {
    throw new Error(
      `Refusing to reset findings on production database host ${databaseHost}. ` +
      `Use ${PRODUCTION_OVERRIDE_FLAG} only when you explicitly accept that risk.`,
    );
  }

  const reportedOn = utcDay(new Date());
  const deleted = await deleteFindingsForReportedDay(reportedOn);
  console.log(JSON.stringify({ reportedOn, deleted }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    await main();
  } finally {
    await closeDb();
  }
}
