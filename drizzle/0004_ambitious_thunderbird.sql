CREATE TABLE `assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` text NOT NULL,
	`category` varchar(50) NOT NULL,
	`purchase_price` int NOT NULL,
	`purchase_date` timestamp NOT NULL,
	`expected_lifespan` int NOT NULL,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assets_id` PRIMARY KEY(`id`)
);
