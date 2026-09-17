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
