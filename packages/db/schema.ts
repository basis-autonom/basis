import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const findings = pgTable(
  "findings",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    detectedAt: timestamp("detected_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    reportedOn: date("reported_on").notNull(),
    tokenAddress: text("token_address").notNull(),
    symbol: text("symbol"),
    stockPair: text("stock_pair"),
    priceMovement: numeric("price_movement", {
      precision: 20,
      scale: 10,
      mode: "number",
    }),
    memeComponent: numeric("meme_component", {
      precision: 20,
      scale: 10,
      mode: "number",
    }),
    stockComponent: numeric("stock_component", {
      precision: 20,
      scale: 10,
      mode: "number",
    }),
    liquidity: numeric("liquidity", {
      precision: 30,
      scale: 10,
      mode: "number",
    }),
  },
  (table) => [
    uniqueIndex("findings_token_address_reported_on_idx").on(
      table.tokenAddress,
      table.reportedOn,
    ),
    index("findings_detected_at_idx").on(table.detectedAt),
    index("findings_token_address_idx").on(table.tokenAddress),
  ],
);

export type Finding = typeof findings.$inferSelect;
export type NewFinding = typeof findings.$inferInsert;

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
    mode: "date",
  }).notNull().defaultNow(),
});

export const xPostRecords = pgTable(
  "x_post_records",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    findingId: integer("finding_id").notNull(),
    postedOn: date("posted_on").notNull(),
    content: text("content").notNull(),
    status: text("status").notNull().default("reserved"),
    externalId: text("external_id"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("x_post_records_finding_id_idx").on(table.findingId),
    index("x_post_records_posted_on_idx").on(table.postedOn),
  ],
);

export type AppSetting = typeof appSettings.$inferSelect;
export type XPostRecord = typeof xPostRecords.$inferSelect;

export const poolSnapshots = pgTable(
  "pool_snapshots",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    poolAddress: text("pool_address").notNull(),
    timestamp: timestamp("timestamp", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    sqrtPriceX96: text("sqrt_price_x96").notNull(),
    tick: integer("tick").notNull(),
  },
  (table) => [
    index("pool_snapshots_pool_address_idx").on(table.poolAddress),
    index("pool_snapshots_timestamp_idx").on(table.timestamp),
    uniqueIndex("pool_snapshots_pool_address_timestamp_idx").on(
      table.poolAddress,
      table.timestamp,
    ),
  ],
);

export type PoolSnapshot = typeof poolSnapshots.$inferSelect;
export type NewPoolSnapshot = typeof poolSnapshots.$inferInsert;
