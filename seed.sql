INSERT INTO `items` (`id`, `name`, `category`, `attribute`, `price`, `reducedPrice`, `infos`, `image`, `stock`) VALUES
('ticket-player', 'Place joueur', 'ticket', NULL, 1500, 1100, NULL, NULL, NULL),
('ticket-coach', 'Place coach', 'ticket', NULL, 1200, NULL, NULL, NULL, 40),
('ticket-visitor', 'Place accompagnateur', 'ticket', NULL, 1200, NULL, NULL, NULL, 60),
('discount-switch-ssbu', 'Réduction si tu amène ta propre Nintendo Switch', 'supplement', NULL, -300, NULL, NULL, NULL, 16),
('ethernet-5', 'Câble ethernet (5m)', 'supplement', NULL, 700, NULL, 'Un câble ethernet est requis pour se brancher aux switchs des tables', NULL, 30),
('ethernet-7', 'Câble ethernet (7m)', 'supplement', NULL, 1000, NULL, 'Un câble ethernet plus long pour les joueurs situés en bout de table', NULL, 30),
('multi-socket', 'Multiprise 3 trous', 'supplement', NULL, 500, NULL, 'Une multiprise 3 trous pour brancher tout ton setup', NULL, 30),
('pin', "Pin's", 'supplement', NULL, 100, NULL, "Un pin's doré, souvenir de cette LAN de folie", 'pin.png', 200),
('tombola', 'Ticket tombola', 'supplement', NULL, 100, NULL, 'Participe à la tombola qui aura lieu pendant le weekend !', NULL, NULL),
('tshirt-f-s', 'T-shirt UA 2020 (Femme)', 'supplement', 's', 1300, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', 20),
('tshirt-f-m', 'T-shirt UA 2020 (Femme)', 'supplement', 'm', 1300, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', 20),
('tshirt-f-l', 'T-shirt UA 2020 (Femme)', 'supplement', 'l', 1300, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', 20),
('tshirt-f-xl', 'T-shirt UA 2020 (Femme)', 'supplement', 'xl', 1300, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', 20),
('tshirt-h-s', 'T-shirt UA 2020 (Homme)', 'supplement', 's', 1300, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', 20),
('tshirt-h-m', 'T-shirt UA 2020 (Homme)', 'supplement', 'm', 1300, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', 20),
('tshirt-h-l', 'T-shirt UA 2020 (Homme)', 'supplement', 'l', 1300, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', 20),
('tshirt-h-xl', 'T-shirt UA 2020 (Homme)', 'supplement', 'xl', 1300, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', 20);

INSERT INTO `settings` (`id`, `value`) VALUES
('login', 0),
('shop', 0);

INSERT INTO `tournaments` (`id`, `name`, `maxPlayers`, `playersPerTeam`) VALUES
('lolCompetitive', 'League of Legends Pro', 80, 5),
('lolLeisure', 'League of Legends Amateur', 80, 5),
('csgo', 'Counter-Strike : Global Offensive', 80, 5),
('ssbu', 'Super Smash Bros Ultimate', 64, 1),
('rl', 'Rocket League', 96, 3),
('osu', 'Osu!', 24, 1),
('open', 'Tournoi Libre', 24, 1);
