CREATE TABLE IF NOT EXISTS "findings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "findings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"detected_at" timestamp with time zone NOT NULL,
	"reported_on" date NOT NULL,
	"token_address" text NOT NULL,
	"symbol" text,
	"stock_pair" text,
	"price_movement" numeric(20, 10),
	"meme_component" numeric(20, 10),
	"stock_component" numeric(20, 10),
	"liquidity" numeric(30, 10)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "findings_token_address_reported_on_idx" ON "findings" USING btree ("token_address","reported_on");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "findings_detected_at_idx" ON "findings" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "findings_token_address_idx" ON "findings" USING btree ("token_address");
