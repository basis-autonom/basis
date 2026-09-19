import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { appSettings } from "./schema";

export const WATCHER_POST_X_SETTING = "watcher.post_x";

function envBoolean(name: string, fallback: boolean) {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export async function getWatcherPostXEnabled() {
  const [setting] = await getDb()
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, WATCHER_POST_X_SETTING))
    .limit(1);

  return setting ? setting.value === "true" : envBoolean("WATCHER_POST_X", false);
}

export async function setWatcherPostXEnabled(enabled: boolean) {
  const [setting] = await getDb()
    .insert(appSettings)
    .values({
      key: WATCHER_POST_X_SETTING,
      value: String(enabled),
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value: String(enabled),
        updatedAt: new Date(),
      },
    })
    .returning();

  return setting;
}
