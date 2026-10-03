CREATE TABLE `cases` (
	`case_key` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`source_type` text NOT NULL,
	`brief_json` text DEFAULT '{}' NOT NULL,
	`annotations_json` text DEFAULT '{}' NOT NULL,
	`plan_json` text DEFAULT '{}' NOT NULL,
	`notes_json` text DEFAULT '{}' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_key` text NOT NULL,
	`captured_at` text NOT NULL,
	`source_json` text NOT NULL,
	`analysis_json` text NOT NULL,
	`comment_count` integer NOT NULL,
	`need_keys_json` text NOT NULL,
	FOREIGN KEY (`case_key`) REFERENCES `cases`(`case_key`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`variant` text NOT NULL,
	`snapshot_id` integer NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`evidence_ids_json` text DEFAULT '[]' NOT NULL,
	`counterexample_id` text DEFAULT '' NOT NULL,
	`hypothesis` text DEFAULT '' NOT NULL,
	`review_status` text DEFAULT 'pending' NOT NULL,
	`unsupported_claim` integer DEFAULT 0 NOT NULL,
	`reviewer_note` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshots`(`id`) ON UPDATE no action ON DELETE no action
);
