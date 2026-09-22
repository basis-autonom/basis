CREATE TABLE "pool_snapshots" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pool_snapshots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"pool_address" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"sqrt_price_x96" text NOT NULL,
	"tick" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX "pool_snapshots_pool_address_idx" ON "pool_snapshots" USING btree ("pool_address");--> statement-breakpoint
CREATE INDEX "pool_snapshots_timestamp_idx" ON "pool_snapshots" USING btree ("timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "pool_snapshots_pool_address_timestamp_idx" ON "pool_snapshots" USING btree ("pool_address","timestamp");