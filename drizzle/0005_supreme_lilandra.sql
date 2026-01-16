ALTER TABLE `users` ADD `wechatOpenid` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `alipayUserId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `loginType` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_wechatOpenid_unique` UNIQUE(`wechatOpenid`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_alipayUserId_unique` UNIQUE(`alipayUserId`);