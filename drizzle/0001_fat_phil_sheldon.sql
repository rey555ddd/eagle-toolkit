CREATE TABLE `feedbacks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nickname` varchar(50) NOT NULL,
	`category` enum('feature','ui','bug','other') NOT NULL DEFAULT 'feature',
	`content` text NOT NULL,
	`adminReply` text,
	`status` enum('pending','inprogress','done','closed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feedbacks_id` PRIMARY KEY(`id`)
);
