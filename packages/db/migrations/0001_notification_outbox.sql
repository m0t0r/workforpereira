CREATE TABLE "notification_outbox" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notification_outbox_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"recipient_email" text NOT NULL,
	"template" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_outbox_publicId_unique" UNIQUE("public_id"),
	CONSTRAINT "notification_outbox_template_check" CHECK ("notification_outbox"."template" in ('offer_received', 'offer_accepted', 'offer_declined', 'offer_withdrawn', 'offer_expired')),
	CONSTRAINT "notification_outbox_attempts_check" CHECK ("notification_outbox"."attempts" >= 0)
);
--> statement-breakpoint
CREATE INDEX "notification_outbox_next_attempt_at_idx" ON "notification_outbox" USING btree ("next_attempt_at","created_at") WHERE "notification_outbox"."sent_at" is null;--> statement-breakpoint
CREATE INDEX "notification_outbox_sent_at_idx" ON "notification_outbox" USING btree ("sent_at");