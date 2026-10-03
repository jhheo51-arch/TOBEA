CREATE TABLE `cx_project_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_key` text NOT NULL,
	`revision` integer NOT NULL,
	`data_json` text NOT NULL,
	`saved_at` text NOT NULL,
	FOREIGN KEY (`case_key`) REFERENCES `cases`(`case_key`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_revision_unique` ON `cx_project_history` (`case_key`,`revision`);--> statement-breakpoint
CREATE TABLE `cx_projects` (
	`case_key` text PRIMARY KEY NOT NULL,
	`data_json` text DEFAULT '{}' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`case_key`) REFERENCES `cases`(`case_key`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `study_sessions` ADD `participant_code` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `study_sessions` ADD `record_kind` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `study_sessions` ADD `familiarity` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `study_sessions` ADD `assignment` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `study_sessions` ADD `outcome` text DEFAULT 'started' NOT NULL;--> statement-breakpoint
ALTER TABLE `study_sessions` ADD `ease_rating` integer;--> statement-breakpoint
ALTER TABLE `study_sessions` ADD `observation` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `actual_participant_once` ON `study_sessions` (`snapshot_id`,`participant_code`) WHERE record_kind = 'actual';