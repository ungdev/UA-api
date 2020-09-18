-- MySQL dump 10.13  Distrib 8.0.17, for Win64 (x86_64)
--
-- Host: localhost    Database: arena
-- ------------------------------------------------------
-- Server version	8.0.17

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cartitems`
--

DROP TABLE IF EXISTS `cartitems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cartitems` (
  `id` char(6) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `quantity` int(11) NOT NULL,
  `itemId` varchar(255) NOT NULL,
  `cartId` char(6) NOT NULL,
  `forUserId` char(6) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`itemId`) REFERENCES `items` (`id`),
  FOREIGN KEY (`cartId`) REFERENCES `carts` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`forUserId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cartitems`
--

LOCK TABLES `cartitems` WRITE;
/*!40000 ALTER TABLE `cartitems` DISABLE KEYS */;
/*!40000 ALTER TABLE `cartitems` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carts`
--

DROP TABLE IF EXISTS `carts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carts` (
  `id` char(6) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `transactionState` enum('pending','paid','canceled','refused','refunded') NOT NULL DEFAULT 'pending',
  `transactionId` int(11) DEFAULT NULL,
  `paidAt` datetime DEFAULT NULL,
  `userId` char(6) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carts`
--

LOCK TABLES `carts` WRITE;
/*!40000 ALTER TABLE `carts` DISABLE KEYS */;
/*!40000 ALTER TABLE `carts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `items`
--

LOCK TABLES `items` WRITE;
/*!40000 ALTER TABLE `items` DISABLE KEYS */;
INSERT INTO `items` VALUES ('ethernet-5','Câble ethernet (5m)','item',NULL,700,NULL,'Un câble ethernet est requis pour se brancher aux switchs des tables',NULL,0),('ethernet-7','Câble ethernet (7m)','item',NULL,1000,NULL,'Un câble ethernet plus long pour les joueurs situés en bout de table',NULL,0),('multi-socket','Multiprise 3 trous','item',NULL,500,NULL,'Une multiprise 3 trous pour brancher tout ton setup',NULL,0),('pin','Pin\'s','item',NULL,100,NULL,'Un pin\'s doré, souvenir de cette LAN de folie','pin.png',0),('ticket-coach','Place coach','ticket',NULL,0,NULL,NULL,NULL,NULL),('ticket-player','Place joueur','ticket',NULL,800,500,NULL,NULL,NULL),('ticket-visitor','Place accompagnateur','ticket',NULL,1200,NULL,NULL,NULL,0),('tombola','Ticket tombola','item',NULL,100,NULL,'Participe à la tombola qui aura lieu pendant le weekend !',NULL,0),('tshirt-f-l','T-shirt UA 2020 (Femme)','item','l',1299,NULL,'Un t-shirt souvenir de cette LAN de folie','tshirt.png',0),('tshirt-f-m','T-shirt UA 2020 (Femme)','item','m',1299,NULL,'Un t-shirt souvenir de cette LAN de folie','tshirt.png',0),('tshirt-f-s','T-shirt UA 2020 (Femme)','item','s',1299,NULL,'Un t-shirt souvenir de cette LAN de folie','tshirt.png',0),('tshirt-f-xl','T-shirt UA 2020 (Femme)','item','xl',1299,NULL,'Un t-shirt souvenir de cette LAN de folie','tshirt.png',0),('tshirt-h-l','T-shirt UA 2020 (Homme)','item','l',1299,NULL,'Un t-shirt souvenir de cette LAN de folie','tshirt.png',0),('tshirt-h-m','T-shirt UA 2020 (Homme)','item','m',1299,NULL,'Un t-shirt souvenir de cette LAN de folie','tshirt.png',0),('tshirt-h-s','T-shirt UA 2020 (Homme)','item','s',1299,NULL,'Un t-shirt souvenir de cette LAN de folie','tshirt.png',0),('tshirt-h-xl','T-shirt UA 2020 (Homme)','item','xl',1299,NULL,'Un t-shirt souvenir de cette LAN de folie','tshirt.png',0);
/*!40000 ALTER TABLE `items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `id` varchar(255) NOT NULL,
  `value` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES ('login','false'),('shop','false');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teams`
--

DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teams` (
  `id` char(6) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `name` varchar(255) NOT NULL,
  `lockedAt` datetime DEFAULT NULL,
  `captainId` char(6) NOT NULL,
  `tournamentId` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`captainId`) REFERENCES `users` (`id`),
  FOREIGN KEY (`tournamentId`) REFERENCES `tournaments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teams`
--

LOCK TABLES `teams` WRITE;
/*!40000 ALTER TABLE `teams` DISABLE KEYS */;
/*!40000 ALTER TABLE `teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournaments`
--

DROP TABLE IF EXISTS `tournaments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournaments` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `maxPlayers` smallint(6) NOT NULL,
  `playersPerTeam` smallint(6) NOT NULL,
  PRIMARY KEY (`id`),
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournaments`
--

LOCK TABLES `tournaments` WRITE;
/*!40000 ALTER TABLE `tournaments` DISABLE KEYS */;
INSERT INTO `tournaments` VALUES ('csgo','Counter-Strike : Global Offensive',80,5),('lol','League of Legends',160,5),('rl','Rocket League',48,3),('ssbu','Super Smash Bros Ultimate',64,1),('tft','Teamfight Tactics',16,1),('valorant','Valorant',80,5);
/*!40000 ALTER TABLE `tournaments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` char(6) NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
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
  PRIMARY KEY (`id`),
  FOREIGN KEY (`askingTeamId`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
   FOREIGN KEY (`teamId`) REFERENCES `teams` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2020-09-17 22:04:35
