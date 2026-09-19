CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "x_post_records" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "x_post_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"finding_id" integer NOT NULL,
	"posted_on" date NOT NULL,
	"content" text NOT NULL,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "x_post_records_finding_id_idx" ON "x_post_records" USING btree ("finding_id");--> statement-breakpoint
CREATE INDEX "x_post_records_posted_on_idx" ON "x_post_records" USING btree ("posted_on");