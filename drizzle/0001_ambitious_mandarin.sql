CREATE TABLE `addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`label` varchar(80) NOT NULL,
	`recipient` varchar(160) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`addressLine` text NOT NULL,
	`city` varchar(100),
	`isDefault` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(100) NOT NULL,
	`entity` varchar(80) NOT NULL,
	`entityId` int,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`selectedOptions` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cart_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int,
	`name` varchar(160) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`description` text,
	`imageUrl` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isVisible` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`type` enum('percentage','fixed') NOT NULL,
	`value` decimal(10,2) NOT NULL,
	`minimumOrder` decimal(10,2) NOT NULL DEFAULT '0',
	`usageLimit` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`startsAt` timestamp,
	`endsAt` timestamp,
	`isActive` tinyint NOT NULL DEFAULT 1,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`filename` varchar(220) NOT NULL,
	`url` text NOT NULL,
	`fileKey` text NOT NULL,
	`mimeType` varchar(100),
	`sizeBytes` int,
	`folder` varchar(120) NOT NULL DEFAULT 'products',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`type` varchar(40) NOT NULL DEFAULT 'order',
	`isRead` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(220) NOT NULL,
	`imageUrl` text,
	`quantity` int NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`selectedOptions` text,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`customerName` varchar(160) NOT NULL,
	`customerPhone` varchar(32) NOT NULL,
	`customerEmail` varchar(320),
	`address` text,
	`status` enum('new','reviewing','confirmed','preparing','ready_to_ship','shipped','delivered','completed','cancelled','returned') NOT NULL DEFAULT 'new',
	`paymentMethod` varchar(60) NOT NULL DEFAULT 'cod',
	`paymentStatus` enum('pending','paid','failed','refunded','cancelled') NOT NULL DEFAULT 'pending',
	`shippingMethod` varchar(80) NOT NULL DEFAULT 'local_delivery',
	`subtotal` decimal(10,2) NOT NULL,
	`discount` decimal(10,2) NOT NULL DEFAULT '0',
	`shipping` decimal(10,2) NOT NULL DEFAULT '0',
	`total` decimal(10,2) NOT NULL,
	`couponCode` varchar(40),
	`notes` text,
	`isWhatsapp` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int,
	`name` varchar(220) NOT NULL,
	`slug` varchar(240) NOT NULL,
	`shortDescription` text,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`oldPrice` decimal(10,2),
	`currency` varchar(8) NOT NULL DEFAULT 'LYD',
	`sku` varchar(80) NOT NULL,
	`barcode` varchar(80),
	`brand` varchar(120),
	`imageUrl` text NOT NULL,
	`gallery` text,
	`options` text,
	`stock` int NOT NULL DEFAULT 0,
	`weight` decimal(8,2),
	`isFeatured` tinyint NOT NULL DEFAULT 0,
	`isNew` tinyint NOT NULL DEFAULT 0,
	`isBestSeller` tinyint NOT NULL DEFAULT 0,
	`status` enum('active','draft','out_of_stock') NOT NULL DEFAULT 'active',
	`seoTitle` varchar(220),
	`seoDescription` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `products_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`isVerified` tinyint NOT NULL DEFAULT 0,
	`isVisible` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `store_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeName` varchar(160) NOT NULL DEFAULT 'Noir Atelier',
	`tagline` varchar(240) NOT NULL DEFAULT 'طقوس يومية، بصياغة استثنائية',
	`logoUrl` text,
	`heroImageUrl` text,
	`whatsappNumber` varchar(40),
	`phone` varchar(40),
	`email` varchar(320),
	`currency` varchar(8) NOT NULL DEFAULT 'LYD',
	`freeShippingThreshold` decimal(10,2) NOT NULL DEFAULT '250',
	`localShippingFee` decimal(10,2) NOT NULL DEFAULT '15',
	`enableWhatsapp` tinyint NOT NULL DEFAULT 1,
	`enableOnlinePayment` tinyint NOT NULL DEFAULT 0,
	`privacyPolicy` text,
	`terms` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `store_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','manager','orders_manager','products_manager','content_manager','support') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
CREATE INDEX `cart_user_idx` ON `cart_items` (`userId`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_created_idx` ON `orders` (`createdAt`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`categoryId`);--> statement-breakpoint
CREATE INDEX `products_status_idx` ON `products` (`status`);