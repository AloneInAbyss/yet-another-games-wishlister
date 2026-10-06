CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`email` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_account_idx` ON `accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_user_provider_idx` ON `accounts` (`user_id`,`provider`);--> statement-breakpoint
CREATE TABLE `app_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `games` (
	`app_id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`capsule_image` text,
	`header_image` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`is_early_access` integer DEFAULT false NOT NULL,
	`is_free` integer DEFAULT false NOT NULL,
	`price_initial` integer,
	`price_final` integer,
	`discount_percent` integer DEFAULT 0 NOT NULL,
	`lowest_price_seen` integer,
	`coming_soon` integer DEFAULT false NOT NULL,
	`release_date_text` text,
	`release_date` text,
	`review_score` integer,
	`review_percent` integer,
	`review_total` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app_id` integer NOT NULL,
	`price_final` integer NOT NULL,
	`discount_percent` integer NOT NULL,
	`recorded_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `games`(`app_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `price_history_app_recorded_idx` ON `price_history` (`app_id`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `steam_tags` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text,
	`display_name` text NOT NULL,
	`avatar_url` text,
	`list_public` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `wishlist_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`app_id` integer NOT NULL,
	`position` real NOT NULL,
	`duration_hours` real,
	`notes` text,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_id`) REFERENCES `games`(`app_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wishlist_items_user_app_idx` ON `wishlist_items` (`user_id`,`app_id`);--> statement-breakpoint
CREATE INDEX `wishlist_items_user_position_idx` ON `wishlist_items` (`user_id`,`position`);