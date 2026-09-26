ALTER TABLE `attendance` DROP FOREIGN KEY `attendance_recordedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `attendance` DROP COLUMN `recordedBy`;--> statement-breakpoint
DROP TABLE `users`;
