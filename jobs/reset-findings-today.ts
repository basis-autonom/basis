import { fileURLToPath } from "node:url";
import { closeDb } from "../packages/db/client";
import { deleteFindingsForReportedDay } from "../packages/db/findings";

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
