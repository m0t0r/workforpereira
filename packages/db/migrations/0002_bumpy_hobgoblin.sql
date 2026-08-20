CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "consents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"person_id" bigint,
	"subject_key" text NOT NULL,
	"purpose" text NOT NULL,
	"is_granted" boolean NOT NULL,
	"granted_at" timestamp with time zone NOT NULL,
	"document_version_id" bigint NOT NULL,
	"subject_kind" text,
	"subject_public_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consents_purpose_check" CHECK ("consents"."purpose" in ('account', 'transactional_messages', 'safety', 'publish', 'disclose_contact', 'photo')),
	CONSTRAINT "consents_subject_check" CHECK (("consents"."subject_kind" is null) = ("consents"."subject_public_id" is null))
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "document_versions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"kind" text NOT NULL,
	"slug" text NOT NULL,
	"version" text NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"body" text NOT NULL,
	"content_hash" text NOT NULL,
	"processing_policy_version_id" bigint,
	"privacy_notice_version_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_versions_slug_version_unique" UNIQUE("slug","version"),
	CONSTRAINT "document_versions_kind_check" CHECK ("document_versions"."kind" in ('processing_policy', 'privacy_notice', 'disclosure')),
	CONSTRAINT "document_versions_pins_check" CHECK (("document_versions"."kind" = 'disclosure') = ("document_versions"."processing_policy_version_id" is not null)
        and ("document_versions"."kind" = 'disclosure') = ("document_versions"."privacy_notice_version_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "persons" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "persons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"public_id" uuid NOT NULL,
	"user_id" text,
	"full_name" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "persons_publicId_unique" UNIQUE("public_id"),
	CONSTRAINT "persons_userId_unique" UNIQUE("user_id"),
	CONSTRAINT "persons_full_name_check" CHECK (length(trim("persons"."full_name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_outbox" DROP CONSTRAINT "notification_outbox_template_check";--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD COLUMN "token" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_document_version_id_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_processing_policy_version_id_document_versions_id_fk" FOREIGN KEY ("processing_policy_version_id") REFERENCES "public"."document_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_privacy_notice_version_id_document_versions_id_fk" FOREIGN KEY ("privacy_notice_version_id") REFERENCES "public"."document_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_issuer_accountId_uidx" ON "accounts" USING btree ("issuer","account_id");--> statement-breakpoint
CREATE INDEX "accounts_userId_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "consents_person_id_purpose_granted_at_idx" ON "consents" USING btree ("person_id","purpose","granted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "consents_subject_key_idx" ON "consents" USING btree ("subject_key");--> statement-breakpoint
CREATE INDEX "consents_document_version_id_idx" ON "consents" USING btree ("document_version_id");--> statement-breakpoint
CREATE INDEX "document_versions_processing_policy_version_id_idx" ON "document_versions" USING btree ("processing_policy_version_id");--> statement-breakpoint
CREATE INDEX "document_versions_privacy_notice_version_id_idx" ON "document_versions" USING btree ("privacy_notice_version_id");--> statement-breakpoint
CREATE INDEX "sessions_userId_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_token_check" CHECK ("notification_outbox"."token" is null or "notification_outbox"."template" in ('email_verification', 'password_reset'));--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_template_check" CHECK ("notification_outbox"."template" in ('offer_received', 'offer_accepted', 'offer_declined', 'offer_withdrawn', 'offer_expired', 'email_verification', 'password_reset'));