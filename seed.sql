INSERT INTO `items` (`id`, `name`, `category`, `attribute`, `price`, `reducedPrice`, `infos`, `image`, `stock`) VALUES
('ticket-player', 'Place joueur', 'ticket', NULL, 2500, 2000, NULL, NULL, NULL),
('ticket-player-ssbu', 'Place joueur (SSBU)', 'ticket', NULL, 2200, 1700, NULL, NULL, NULL),
('ticket-coach', 'Place coach/manager', 'ticket', NULL, 1500, NULL, NULL, NULL, NULL),
('ticket-attendant', 'Place accompagnateur', 'ticket', NULL, 1500, NULL, NULL, NULL, NULL),
('discount-switch-ssbu', 'Réduction si tu amènes ta propre Nintendo Switch', 'supplement', NULL, -300, NULL, 'Une réduction applicable si tu amènes ta propre Nintendo Switch pendant le weekend. Il faut que tu aies le jeu SSBU avec tous les personnages et que tu prennes un cable HDMI.', NULL, 30),
('ethernet-7', 'Câble ethernet (7m)', 'supplement', NULL, 1000, NULL, 'Un câble ethernet est requis pour se brancher aux switchs des tables', NULL, NULL),
('multi-socket', 'Multiprise 3 trous', 'supplement', NULL, 500, NULL, 'Une multiprise 3 trous pour brancher tout ton setup', NULL, NULL),
('pc', 'Location PC Gaming', 'supplement', NULL, 12000, NULL, 'PC Intel i7 ou équivalent AMD, NVIDIA RTX ou AMD 6600XT, 16Go RAM, 500Go SSD, fourni avec clavier, souris et casque', NULL, NULL),
('monitor', 'Location Ecran Gaming', 'supplement', NULL, 4000, NULL, 'Ecran 24" VIEWSONIC 144Hz 1ms', NULL, NULL),
('chair', 'Location Chaise Gaming', 'supplement', NULL, 4000, NULL, 'Une chaise plus confortable que celle de la LAN', NULL, NULL),
('pin', "Pin's", 'supplement', NULL, 200, NULL, "Un pin's argenté, souvenir de cette LAN de folie", 'pin.png', 100),
('tshirt-s', 'T-shirt UA 2022 (Unixese)', 'supplement', 's', 1500, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', 30),
('tshirt-m', 'T-shirt UA 2022 (Unixese)', 'supplement', 'm', 1500, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', 30),
('tshirt-l', 'T-shirt UA 2022 (Unixese)', 'supplement', 'l', 1500, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', 30),
('tshirt-xl', 'T-shirt UA 2022 (Unixese)', 'supplement', 'xl', 1500, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', 30);

INSERT INTO `settings` (`id`, `value`) VALUES
('login', 0),
('shop', 0);

INSERT INTO `tournaments` (`id`, `name`, `maxPlayers`, `playersPerTeam`) VALUES
('lol', 'League of Legends', 160, 5),
('ssbu', 'SSBU', 128, 1),
('csgo', 'Counter-Strike : Global Offensive', 80, 5),
('valorant', 'Valorant', 80, 5),
('rl', 'Rocket League', 48, 3),
('osu', 'Osu!', 48, 1),
('tft', 'Teamfight Tactics', 32, 1),
('open', 'Tournoi Libre', 56, 1);
