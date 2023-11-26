INSERT INTO `items` (`id`, `name`, `category`, `attribute`, `price`, `reducedPrice`, `infos`, `image`, `stock`, `position`) VALUES
('ticket-player', 'Place joueur', 'ticket', NULL, 2500, 2000, NULL, NULL, NULL, 0),
('ticket-player-ssbu', 'Place joueur (SSBU)', 'ticket', NULL, 2200, 1700, NULL, NULL, NULL, 1),
('ticket-coach', 'Place coach/manager', 'ticket', NULL, 1500, NULL, NULL, NULL, NULL, 2),
('ticket-attendant', 'Place accompagnateur', 'ticket', NULL, 1500, NULL, NULL, NULL, NULL, 3),
('ticket-spectator', 'Place spectateur', 'ticket', NULL, 1000, NULL, NULL, NULL, 100, 4),
('discount-switch-ssbu', 'Réduction si tu amènes ta propre Nintendo Switch', 'supplement', NULL, -300, NULL, 'Une réduction applicable si tu amènes ta propre Nintendo Switch pendant le weekend. Il faut que tu aies le jeu SSBU avec tous les personnages et que tu prennes un cable HDMI.', NULL, 30, 5),
('ethernet-7', 'Câble ethernet (7m)', 'supplement', NULL, 1000, NULL, 'Un câble ethernet est requis pour se brancher aux switchs des tables', NULL, NULL, 11),
('multi-socket', 'Multiprise 3 trous', 'supplement', NULL, 500, NULL, 'Une multiprise 3 trous pour brancher tout ton setup', NULL, NULL, 12),
('pin', "Pin's", 'supplement', NULL, 200, NULL, "Un pin's argenté, souvenir de cette LAN de folie", 'pin.png', 100, 10),
('tshirt-s', 'T-shirt UA 2022 (Unixese)', 'supplement', 's', 1500, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', 30, 6),
('tshirt-m', 'T-shirt UA 2022 (Unixese)', 'supplement', 'm', 1500, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', 30, 7),
('tshirt-l', 'T-shirt UA 2022 (Unixese)', 'supplement', 'l', 1500, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', 30, 8),
('tshirt-xl', 'T-shirt UA 2022 (Unixese)', 'supplement', 'xl', 1500, NULL, 'Un t-shirt souvenir de cette LAN de folie', 'tshirt.png', 30, 9),
('pc', 'Location de PC', 'rent', NULL, 14000, NULL, 'Location de PC si tu ne peux pas amener le tien pendant l''UTT Arena. L''un des PC suivants sera mis à ta disposition :->AMD Ryzen 5 2600,16GB RAM SSD 500G° et 2060 ou 6600XT->INTEL I5 8500 16GB RAM SSD 500G° et 2060 ou 6600XT->AMD RYZEN 5 5600X 500G° SSD et 2060 ou 6600XT', NULL, 7, 13);

INSERT INTO `settings` (`id`, `value`) VALUES
('login', 0),
('shop', 0),
('trombi', 0);

INSERT INTO `tournaments` (`id`, `name`, `maxPlayers`, `playersPerTeam`, `coachesPerTeam`, `cashprize`, `position`) VALUES
('lol', 'League of Legends', 160, 5, 2, 0, 1),
('ssbu', 'Super Smash Bros. Ultimate', 64, 1, 1, 0, 2),
('cs2', 'Counter-Strike 2', 80, 5, 2, 0, 3),
('rl', 'Rocket League', 60, 3, 2, 0, 4),
('osu', 'Osu!', 64, 1, 1, 0, 5),
('tft', 'Teamfight Tactics', 32, 1, 1, 0, 6),
('open', 'Libre', 40, 1, 1, 0, 7),
('pokemon', 'Pokémon', 24, 1, 1, 0, 8);

INSERT INTO `commission` (`id`, `name`, `nameOnBadge`, `position`, `color`, `masterCommissionId`) VALUES
('animation', 'Animation', 'Anim', 1, '#123456', NULL),
('animation_console', 'Animation stand console', 'Anim stand console', 2, '#123456', 'animation'),
('animation_cs2', 'Animation CS2', 'Anim CS2', 3, '#123456', 'animation'),
('animation_lol', 'Animation LoL', 'Anim LoL', 4, '#123456', 'animation'),
('animation_open', 'Animation tournoi libre', 'Anim tournoi libre', 5, '#123456', 'animation'),
('animation_osu', 'Animation osu!', 'Anim osu!', 6, '#123456', 'animation'),
('animation_pokemon', 'Animation Pokémon', 'Anim Pokémon', 7, '#123456', 'animation'),
('animation_rl', 'Animation Rocket League', 'Anim RL', 8, '#123456', 'animation'),
('animation_ssbu', 'Animation SSBU', 'Anim SSBU', 9, '#123456', 'animation'),
('animation_tft', 'Animation TFT', 'Anim TFT', 10, '#123456', 'animation'),
('communication', 'Communication', 'Com', 11, '#123456', NULL),
('coord', 'Coordinateur', 'Coord', 0, '#123456', NULL),
('decoration', 'Décoration', 'Déco', 12, '#123456', NULL),
('design', 'Graphisme', 'Graphisme', 13, '#123456', NULL),
('dev', 'Développement', 'Dev', 14, '#123456', NULL),
('electricity', 'Électricité', 'Élec', 15, '#123456', NULL),
('logistique', 'Logistique', 'Log', 16, '#123456', NULL),
('mediatik', 'Médiatik', 'Médiatik', 17, '#123456', NULL),
('partners', 'Partenaires', 'Partenaires', 18, '#123456', NULL),
('restauration', 'Restauration', 'Restauration', 19, '#123456', NULL),
('rozo', 'Réseau', 'Réseau', 20, '#123456', NULL),
('security', 'Sécurité', 'Sécu', 21, '#123456', NULL),
('ssl', 'Stream, son et lumière', 'SSL', 22, '#123456', NULL),
('vieux', 'Vieux', 'Vieux', 23, '#123456', NULL);