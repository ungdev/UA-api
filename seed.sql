-- Adminer 4.7.7 MySQL dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `cartitems`;
CREATE TABLE `cartitems` (
  `id` char(6) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `quantity` int(11) NOT NULL,
  `itemId` varchar(255) NOT NULL,
  `cartId` char(6) NOT NULL,
  `forUserId` char(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `itemId` (`itemId`),
  KEY `cartId` (`cartId`),
  KEY `forUserId` (`forUserId`),
  CONSTRAINT `cartitems_ibfk_1` FOREIGN KEY (`itemId`) REFERENCES `items` (`id`),
  CONSTRAINT `cartitems_ibfk_2` FOREIGN KEY (`cartId`) REFERENCES `carts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cartitems_ibfk_3` FOREIGN KEY (`forUserId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


DROP TABLE IF EXISTS `carts`;
CREATE TABLE `carts` (
  `id` char(6) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `transactionState` enum('pending','paid','canceled','refused','refunded') NOT NULL DEFAULT 'pending',
  `transactionId` int(11) DEFAULT NULL,
  `paidAt` datetime DEFAULT NULL,
  `userId` char(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `carts_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


DROP TABLE IF EXISTS `items`;
CREATE TABLE `items` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` enum('ticket','item') NOT NULL,
  `attribute` varchar(255) DEFAULT NULL,
  `price` smallint(6) NOT NULL,
  `reducedPrice` smallint(6) DEFAULT NULL,
  `infos` varchar(255) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `stock` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `items` (`id`, `name`, `category`, `attribute`, `price`, `reducedPrice`, `infos`, `image`, `stock`) VALUES
('ethernet-5',	'Câble ethernet (5m)',	'item',	NULL,	700,	NULL,	'Un câble ethernet est requis pour se brancher aux switchs des tables',	NULL,	0),
('ethernet-7',	'Câble ethernet (7m)',	'item',	NULL,	1000,	NULL,	'Un câble ethernet plus long pour les joueurs situés en bout de table',	NULL,	0),
('multi-socket',	'Multiprise 3 trous',	'item',	NULL,	500,	NULL,	'Une multiprise 3 trous pour brancher tout ton setup',	NULL,	0),
('pin',	'Pin\'s',	'item',	NULL,	100,	NULL,	'Un pin\'s doré, souvenir de cette LAN de folie',	'pin.png',	0),
('ticket-coach',	'Place coach',	'ticket',	NULL,	0,	NULL,	NULL,	NULL,	NULL),
('ticket-player',	'Place joueur',	'ticket',	NULL,	800,	500,	NULL,	NULL,	NULL),
('ticket-visitor',	'Place accompagnateur',	'ticket',	NULL,	1200,	NULL,	NULL,	NULL,	0),
('tombola',	'Ticket tombola',	'item',	NULL,	100,	NULL,	'Participe à la tombola qui aura lieu pendant le weekend !',	NULL,	0),
('tshirt-f-l',	'T-shirt UA 2020 (Femme)',	'item',	'l',	1299,	NULL,	'Un t-shirt souvenir de cette LAN de folie',	'tshirt.png',	0),
('tshirt-f-m',	'T-shirt UA 2020 (Femme)',	'item',	'm',	1299,	NULL,	'Un t-shirt souvenir de cette LAN de folie',	'tshirt.png',	0),
('tshirt-f-s',	'T-shirt UA 2020 (Femme)',	'item',	's',	1299,	NULL,	'Un t-shirt souvenir de cette LAN de folie',	'tshirt.png',	0),
('tshirt-f-xl',	'T-shirt UA 2020 (Femme)',	'item',	'xl',	1299,	NULL,	'Un t-shirt souvenir de cette LAN de folie',	'tshirt.png',	0),
('tshirt-h-l',	'T-shirt UA 2020 (Homme)',	'item',	'l',	1299,	NULL,	'Un t-shirt souvenir de cette LAN de folie',	'tshirt.png',	0),
('tshirt-h-m',	'T-shirt UA 2020 (Homme)',	'item',	'm',	1299,	NULL,	'Un t-shirt souvenir de cette LAN de folie',	'tshirt.png',	0),
('tshirt-h-s',	'T-shirt UA 2020 (Homme)',	'item',	's',	1299,	NULL,	'Un t-shirt souvenir de cette LAN de folie',	'tshirt.png',	0),
('tshirt-h-xl',	'T-shirt UA 2020 (Homme)',	'item',	'xl',	1299,	NULL,	'Un t-shirt souvenir de cette LAN de folie',	'tshirt.png',	0);

DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `id` varchar(255) NOT NULL,
  `value` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `settings` (`id`, `value`) VALUES
('login',	0),
('shop',  0);

DROP TABLE IF EXISTS `teams`;
CREATE TABLE `teams` (
  `id` char(6) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `name` varchar(255) NOT NULL,
  `lockedAt` datetime DEFAULT NULL,
  `captainId` char(6) NOT NULL,
  `tournamentId` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `captainId` (`captainId`),
  KEY `tournamentId` (`tournamentId`),
  CONSTRAINT `teams_ibfk_1` FOREIGN KEY (`captainId`) REFERENCES `users` (`id`),
  CONSTRAINT `teams_ibfk_2` FOREIGN KEY (`tournamentId`) REFERENCES `tournaments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


DROP TABLE IF EXISTS `tournaments`;
CREATE TABLE `tournaments` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `maxPlayers` int(6) NOT NULL,
  `playersPerTeam` int(6) NOT NULL,
  `toornamentId` varchar(255) DEFAULT NULL,
  `discordRoleId` varchar(255) DEFAULT NULL,
  `discordVocalCategoryId` varchar(255) DEFAULT NULL,
  `discordTextCategoryId` varchar(255) DEFAULT NULL,
  `discordStaffRoleId` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `tournaments` (`id`, `name`, `maxPlayers`, `playersPerTeam`) VALUES
('csgo',	'Counter-Strike : Global Offensive',	80,	5),
('lol',	'League of Legends',	160,	5),
('rl',	'Rocket League',	48,	3),
('ssbu',	'Super Smash Bros Ultimate',	64,	1),
('tft',	'Teamfight Tactics',	16,	1),
('valorant',	'Valorant',	80,	5);

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` char(6) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `username` varchar(100) DEFAULT NULL,
  `firstname` varchar(100) NOT NULL,
  `lastname` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `type` enum('player','coach','visitor','orga') NOT NULL,
  `permissions` varchar(255) DEFAULT NULL,
  `place` char(4) DEFAULT NULL,
  `scannedAt` datetime DEFAULT NULL,
  `discordId` varchar(255) DEFAULT NULL,
  `teamId` char(6) DEFAULT NULL,
  `askingTeamId` char(6) DEFAULT NULL,
  `registerToken` char(6) DEFAULT NULL,
  `resetToken` char(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `askingTeamId` (`askingTeamId`),
  KEY `teamId` (`teamId`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`askingTeamId`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_ibfk_2` FOREIGN KEY (`teamId`) REFERENCES `teams` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


-- 2020-10-04 13:07:17