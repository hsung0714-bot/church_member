CREATE TABLE `attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`weekId` int NOT NULL,
	`memberId` int NOT NULL,
	`attended` boolean NOT NULL DEFAULT false,
	`recordedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_week_member_unique` UNIQUE(`weekId`,`memberId`)
);
--> statement-breakpoint
CREATE TABLE `attendance_weeks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceDate` date NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_weeks_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_weeks_date_unique` UNIQUE(`serviceDate`)
);
--> statement-breakpoint
CREATE TABLE `church_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `church_groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `church_groups_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`groupId` int,
	`phone` varchar(32),
	`status` enum('active','dormant','transferred','new') NOT NULL DEFAULT 'active',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` varchar(120);--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_weekId_attendance_weeks_id_fk` FOREIGN KEY (`weekId`) REFERENCES `attendance_weeks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_memberId_members_id_fk` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_recordedBy_users_id_fk` FOREIGN KEY (`recordedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `members` ADD CONSTRAINT `members_groupId_church_groups_id_fk` FOREIGN KEY (`groupId`) REFERENCES `church_groups`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attendance_member_idx` ON `attendance` (`memberId`);--> statement-breakpoint
CREATE INDEX `members_group_idx` ON `members` (`groupId`);--> statement-breakpoint
CREATE INDEX `members_status_idx` ON `members` (`status`);