CREATE TABLE "daily_challenge_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"user_id" uuid,
	"display_name" text NOT NULL,
	"game_id" uuid NOT NULL,
	"final_score" integer,
	"turns_taken" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_challenge_user" UNIQUE("challenge_id","user_id"),
	CONSTRAINT "uq_challenge_display_name" UNIQUE("challenge_id","display_name")
);
--> statement-breakpoint
CREATE TABLE "daily_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"category_id" text NOT NULL,
	"category_name" text NOT NULL,
	"league" text NOT NULL,
	"league_name" text NOT NULL,
	"team_id" text,
	"team_name" text,
	"stat_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_challenges_date_unique" UNIQUE("date")
);
--> statement-breakpoint
ALTER TABLE "daily_challenge_attempts" ADD CONSTRAINT "daily_challenge_attempts_challenge_id_daily_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."daily_challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_challenge_attempts" ADD CONSTRAINT "daily_challenge_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_challenge_attempts" ADD CONSTRAINT "daily_challenge_attempts_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;