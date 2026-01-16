CREATE TABLE `expense_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` text NOT NULL,
	`category` varchar(50) NOT NULL,
	`frequency` enum('daily','weekly','monthly','seasonal','yearly') NOT NULL,
	`max_amount` int NOT NULL,
	`description` text,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expense_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` text NOT NULL,
	`category` varchar(50) NOT NULL,
	`amount` int NOT NULL,
	`due_date` timestamp NOT NULL,
	`optimal_payment_date` timestamp NOT NULL,
	`recurrence` enum('once','monthly','quarterly','yearly') NOT NULL,
	`notes` text,
	`is_paid` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_reminders_id` PRIMARY KEY(`id`)
);
