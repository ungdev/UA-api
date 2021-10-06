INSERT INTO `items` (`id`, `name`, `category`, `attribute`, `price`, `reducedPrice`, `infos`, `image`, `stock`) VALUES
('ticket-player', 'Place joueur', 'ticket', NULL, 2000, 1500, NULL, NULL, NULL),
('ticket-coach', 'Place coach/manager', 'ticket', NULL, 1200, NULL, NULL, NULL, 35),
('ticket-attendant', 'Place accompagnateur', 'ticket', NULL, 1200, NULL, NULL, NULL, 15),
('ticket-spectator', 'Place spectateur', 'ticket', NULL, 1200, 1000, NULL, NULL, 50),
('discount-switch-ssbu', 'Réduction si tu amènes ta propre Nintendo Switch', 'supplement', NULL, -300, NULL, 'Une réduction applicable si tu amènes ta propre Nintendo Switch pendant le weekend', NULL, 16),
('ethernet-5', 'Câble ethernet (5m)', 'supplement', NULL, 700, NULL, 'Un câble ethernet est requis pour se brancher aux switchs des tables', NULL, NULL),
('ethernet-7', 'Câble ethernet (7m)', 'supplement', NULL, 1000, NULL, 'Un câble ethernet plus long pour les joueurs situés en bout de table', NULL, NULL),
('multi-socket', 'Multiprise 3 trous', 'supplement', NULL, 500, NULL, 'Une multiprise 3 trous pour brancher tout ton setup', NULL, NULL),
('pin', "Pin's", 'supplement', NULL, 100, NULL, "Un pin's doré, souvenir de cette LAN de folie", 'pin.png', NULL),
('tombola', 'Ticket tombola', 'supplement', NULL, 100, NULL, 'Participe à la tombola qui aura lieu pendant le weekend !', NULL, NULL),
('tshirt-f-s', 'T-shirt UA 2020 (Femme)', 'supplement', 's', 1300, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', NULL),
('tshirt-f-m', 'T-shirt UA 2020 (Femme)', 'supplement', 'm', 1300, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', NULL),
('tshirt-f-l', 'T-shirt UA 2020 (Femme)', 'supplement', 'l', 1300, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png',NULL),
('tshirt-f-xl', 'T-shirt UA 2020 (Femme)', 'supplement', 'xl', 1300, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', NULL),
('tshirt-h-s', 'T-shirt UA 2020 (Homme)', 'supplement', 's', 1300, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', NULL),
('tshirt-h-m', 'T-shirt UA 2020 (Homme)', 'supplement', 'm', 1300, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', NULL),
('tshirt-h-l', 'T-shirt UA 2020 (Homme)', 'supplement', 'l', 1300, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', NULL),
('tshirt-h-xl', 'T-shirt UA 2020 (Homme)', 'supplement', 'xl', 1300, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', NULL);

INSERT INTO `settings` (`id`, `value`) VALUES
('login', 0),
('shop', 0);

INSERT INTO `tournaments` (`id`, `name`, `maxPlayers`, `playersPerTeam`) VALUES
('lolCompetitive', 'League of Legends Compétitif', 80, 5),
('lolLeisure', 'League of Legends Loisir', 80, 5),
('csgo', 'Counter-Strike : Global Offensive', 80, 5),
('ssbu', 'SSBU by Murex', 64, 1),
('rl', 'Rocket League', 96, 3),
('osu', 'Osu!', 24, 1),
('open', 'Tournoi Libre', 24, 1);
