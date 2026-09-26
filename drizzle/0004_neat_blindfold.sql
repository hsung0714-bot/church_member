ALTER TABLE `members` DROP FOREIGN KEY `members_groupId_church_groups_id_fk`;
--> statement-breakpoint
DROP INDEX `members_group_idx` ON `members`;--> statement-breakpoint
ALTER TABLE `members` ADD `cohort` int NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `gender` enum('male','female');--> statement-breakpoint
CREATE INDEX `members_cohort_idx` ON `members` (`cohort`);--> statement-breakpoint
ALTER TABLE `members` DROP COLUMN `groupId`;--> statement-breakpoint
DROP TABLE `church_groups`;
