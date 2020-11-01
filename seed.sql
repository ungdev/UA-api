SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';


/****************/
/**** MODELS ****/
/****************/

/** Carts **/
DROP TABLE IF EXISTS `carts`;
CREATE TABLE `carts` (
  `id` char(6) PRIMARY KEY,
  `userId` char(6) NOT NULL,
  `transactionState` enum('pending', 'paid', 'canceled', 'refused', 'refunded') NOT NULL DEFAULT 'pending',
  `transactionId` int(11) DEFAULT NULL,
  `paidAt` datetime DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  CONSTRAINT `carts_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB CHARSET=utf8;

/** CartItems **/
DROP TABLE IF EXISTS `cartitems`;
CREATE TABLE `cartitems` (
  `id` char(6) PRIMARY KEY,
  `itemId` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL,
  `cartId` char(6) NOT NULL,
  `forUserId` char(6) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  CONSTRAINT `cartitems_ibfk_1` FOREIGN KEY (`itemId`) REFERENCES `items` (`id`),
  CONSTRAINT `cartitems_ibfk_2` FOREIGN KEY (`cartId`) REFERENCES `carts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cartitems_ibfk_3` FOREIGN KEY (`forUserId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB CHARSET=utf8;

/** Items **/
DROP TABLE IF EXISTS `items`;
CREATE TABLE `items` (
  `id` varchar(255) PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `category` enum('ticket','item') NOT NULL,
  `attribute` varchar(255) DEFAULT NULL,
  `price` int(11) NOT NULL,
  `reducedPrice` int(11) DEFAULT NULL,
  `infos` varchar(255) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `stock` int(11) DEFAULT NULL
) ENGINE=InnoDB CHARSET=utf8;

/** Settings **/
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `id` varchar(255) PRIMARY KEY,
  `value` tinyint(1)
) ENGINE=InnoDB CHARSET=utf8;

/** Teams **/
DROP TABLE IF EXISTS `teams`;
CREATE TABLE `teams` (
  `id` char(6) PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `tournamentId` varchar(255) NOT NULL,
  `captainId` char(6) NOT NULL,
  `lockedAt` datetime DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  CONSTRAINT `teams_ibfk_1` FOREIGN KEY (`captainId`) REFERENCES `users` (`id`),
  CONSTRAINT `teams_ibfk_2` FOREIGN KEY (`tournamentId`) REFERENCES `tournaments` (`id`)
) ENGINE=InnoDB CHARSET=utf8;

/** Tournaments **/
DROP TABLE IF EXISTS `tournaments`;
CREATE TABLE `tournaments` (
  `id` varchar(255) PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `maxPlayers` int(11) NOT NULL,
  `playersPerTeam` int(11) NOT NULL,
  `toornamentId` varchar(255) DEFAULT NULL,
  `discordRoleId` varchar(255) DEFAULT NULL,
  `discordVocalCategoryId` varchar(255) DEFAULT NULL,
  `discordTextCategoryId` varchar(255) DEFAULT NULL,
  `discordStaffRoleId` varchar(255) DEFAULT NULL,
) ENGINE=InnoDB CHARSET=utf8;

/** Users **/
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` char(6) PRIMARY KEY,
  `username` varchar(255),
  `firstname` varchar(255) NOT NULL,
  `lastname` varchar(255) NOT NULL,
  `email` varchar(255) UNIQUE,
  `password` varchar(255),
  `type` enum('player', 'coach', 'visitor', 'orga') NOT NULL,
  `permissions` varchar(255) DEFAULT NULL,
  `registerToken` char(6) DEFAULT NULL,
  `resetToken` char(6) DEFAULT NULL,
  `place` char(4) UNIQUE DEFAULT NULL,
  `scannedAt` datetime DEFAULT NULL,
  `discordId` varchar(255) UNIQUE DEFAULT NULL,
  `teamId` char(6) DEFAULT NULL,
  `askingTeamId` char(6) DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`askingTeamId`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
  CONSTRAINT `users_ibfk_2` FOREIGN KEY (`teamId`) REFERENCES `teams` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB CHARSET=utf8;


/***************/
/**** SEEDS ****/
/***************/

INSERT INTO `items` (`id`, `name`, `category`, `attribute`, `price`, `reducedPrice`, `infos`, `image`, `stock`) VALUES
('ticket-player',	'Place joueur',	'ticket',	NULL,	1500,	1100,	NULL,	NULL,	NULL),
('ticket-coach',	'Place coach',	'ticket',	NULL,	1200,	NULL,	NULL,	NULL,	40),
('ticket-visitor',	'Place accompagnateur',	'ticket',	NULL,	1200,	NULL,	NULL,	NULL,	60),
('ethernet-5',	'Câble ethernet (5m)',	'item',	NULL,	700,	NULL,	'Un câble ethernet est requis pour se brancher aux switchs des tables',	NULL,	30),
('ethernet-7',	'Câble ethernet (7m)',	'item',	NULL,	1000,	NULL,	'Un câble ethernet plus long pour les joueurs situés en bout de table',	NULL,	30),
('multi-socket',	'Multiprise 3 trous',	'item',	NULL,	500,	NULL,	'Une multiprise 3 trous pour brancher tout ton setup',	NULL,	30),
('pin',	"Pin's",	'item',	NULL,	100,	NULL,	"Un pin's doré, souvenir de cette LAN de folie",	'pin.png',	200),
('tombola',	'Ticket tombola',	'item',	NULL,	100,	NULL,	'Participe à la tombola qui aura lieu pendant le weekend !',	NULL,	NULL),
('tshirt-f-s',	'T-shirt UA 2020 (Femme)',	'item',	's',	1300,	NULL,	'Un t-shirt souvenir de cette LAN de folie',	'tshirt.png',	20),
('tshirt-f-m',	'T-shirt UA 2020 (Femme)',	'item',	'm',	1300,	NULL,	'Un t-shirt souvenir de cette LAN de folie',	'tshirt.png',	20),
('tshirt-f-l',	'T-shirt UA 2020 (Femme)',	'item',	'l',	1300,	NULL,	'Un t-shirt souvenir de cette LAN de folie',	'tshirt.png',	20),
('tshirt-f-xl',	'T-shirt UA 2020 (Femme)',	'item',	'xl',	1300,	NULL,	'Un t-shirt souvenir de cette LAN de folie',	'tshirt.png',	20),
('tshirt-h-s',	'T-shirt UA 2020 (Homme)',	'item',	's',	1300,	NULL,	'Un t-shirt souvenir de cette LAN de folie',	'tshirt.png',	20),
('tshirt-h-m',	'T-shirt UA 2020 (Homme)',	'item',	'm',	1300,	NULL,	'Un t-shirt souvenir de cette LAN de folie',	'tshirt.png',	20),
('tshirt-h-l',	'T-shirt UA 2020 (Homme)',	'item',	'l',	1300,	NULL,	'Un t-shirt souvenir de cette LAN de folie',	'tshirt.png',	20),
('tshirt-h-xl',	'T-shirt UA 2020 (Homme)',	'item',	'xl',	1300,	NULL,	'Un t-shirt souvenir de cette LAN de folie',	'tshirt.png',	20);

INSERT INTO `settings` (`id`, `value`) VALUES
('login',	0),
('shop',  0);

INSERT INTO `tournaments` (`id`, `name`, `maxPlayers`, `playersPerTeam`) VALUES
('lol',	'League of Legends',	160,	5),
('valorant',	'Valorant',	80,	5),
('csgo',	'Counter-Strike : Global Offensive',	80,	5),
('ssbu',	'Super Smash Bros Ultimate',	64,	1),
('rocket-league',	'Rocket League',	48,	3),
('tft',	'Teamfight Tactics',	64,	1);