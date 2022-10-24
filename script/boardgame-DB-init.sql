USE [WAD-MMD-CSD-S21_10407728]
GO

-- 1) dropping all the tables and constraints
-- order: bgCategory, bgBoardgame, bgBoardgameCategory, bgRole, bgAccount, bgPassword

-- bgPassword   
ALTER TABLE bgPassword
DROP CONSTRAINT IF EXISTS bgFK_Password_Account
GO
DROP TABLE bgPassword
GO

-- bgAccount
ALTER TABLE bgAccount
DROP CONSTRAINT IF EXISTS bgFK_Account_Role
GO
DROP TABLE bgAccount
GO

-- bgRole
DROP TABLE IF EXISTS bgRole
GO

-- bgBoardgameCategory
ALTER TABLE bgBoardgameCategory
DROP CONSTRAINT IF EXISTS bgFK_BoardgameCategory_Boardgame
GO
ALTER TABLE bgBoardgameCategory
DROP CONSTRAINT IF EXISTS bgFK_BoardgameCategory_Category
GO
DROP TABLE IF EXISTS bgBoardgameCategory
GO

-- bgBoardgame
DROP TABLE IF EXISTS bgBoardgame
GO

-- bgCategory
DROP TABLE IF EXISTS bgCategory
GO

-- #endregion


-- 2) Creating tables
-- order: bgCategory, bgBoardgame, bgBoardgameCategory, bgRole, bgAccount, bgPassword

-- bgCategory
CREATE TABLE bgCategory
(
    categoryid INT NOT NULL IDENTITY PRIMARY KEY,
    categoryname NVARCHAR(50) NOT NULL
);
GO

-- bgBoardgame
CREATE TABLE bgBoardgame
(
    boardgameid INT NOT NULL IDENTITY PRIMARY KEY,
    title NVARCHAR(100) NOT NULL,
    imageurl NVARCHAR(255),
    bgdescription NVARCHAR(500) NOT NULL,
    minplayers INT NOT NULL,
    maxplayers INT NOT NULL,
    mintime INT NOT NULL,
    maxtime INT NOT NULL,
    minage INT NOT NULL
);
GO

-- bgBoardgameCategory
CREATE TABLE bgBoardgameCategory
(
    FK_boardgameid INT NOT NULL,
    FK_categoryid INT NOT NULL,

    CONSTRAINT bgFK_BoardgameCategory_Boardgame FOREIGN KEY (FK_boardgameid) REFERENCES bgBoardgame (boardgameid),
    CONSTRAINT bgFK_BoardgameCategory_Category FOREIGN KEY (FK_categoryid) REFERENCES bgCategory (categoryid)
);
GO

-- bgRole
CREATE TABLE bgRole
(
    roleid INT NOT NULL IDENTITY PRIMARY KEY,
    rolename NVARCHAR(50) NOT NULL,
    roledescription NVARCHAR(255)
);
GO

-- bgAccount 
CREATE TABLE bgAccount
(
    accountid INT NOT NULL IDENTITY PRIMARY KEY,
    email NVARCHAR(255) NOT NULL UNIQUE,
    FK_roleid INT NOT NULL DEFAULT 1, -- 1 = admin

    CONSTRAINT bgFK_Account_Role FOREIGN KEY (FK_roleid) REFERENCES bgRole (roleid)
);
GO

-- bgPassword
CREATE TABLE bgPassword
(
    FK_accountid INT NOT NULL UNIQUE,
    hashedpassword NVARCHAR(255) NOT NULL,

    CONSTRAINT bgFK_Password_Account FOREIGN KEY (FK_accountid) REFERENCES bgAccount (accountid)
);
GO


-- 3) populating test data
-- order: bgCategory, bgBoardgame, bgBoardgameCategory, bgRole, bgAccount, bgPassword

-- Category
INSERT INTO bgCategory
    ([categoryname])
VALUES
    ('Family'),
    ('Strategy'),
    ('Economic'),
    ('Negotiation'),
    ('Card-game'),
    ('City-building'),
    ('Party'),
    ('Trivia'),
    ('Educational'),
    ('Childrens-game'),
    ('Puzzle'),
    ('Deduction'),
    ('Bluffing'),
    ('Humor'),
    ('Adult'),
    ('Cooperative'),
    ('Adventure'),
    ('Exploration'),
    ('Fighting'),
    ('Horror'),
    ('Fantasy')
GO

-- Boardgame
INSERT INTO bgBoardgame
    ([title], [imageurl], [bgdescription], [minplayers], [maxplayers], [mintime], [maxtime], [minage])
VALUES
    ('Catan', 'https://cdn.shopify.com/s/files/1/2470/9244/products/CatanCool_1024x1024.png?v=1614849986', 'In Catan, players fight to be the dominant force on the island of Catan, by building settlements, cities and roads by rolling dice and spending resource cards.', 3, 4, 75, 75, 10),
    ('7 Wonders', 'https://cdn.shopify.com/s/files/1/2470/9244/products/sev-box-3d-1592411287XEcT9_1024x1024.png?v=1599661211', 'Each player is the leader of one of the 7 great cities of the Ancient World and has to gather points and resources to develop buildings and military. ', 2, 7, 30, 30, 10),
    ('Timeline: Events', 'https://cdn.shopify.com/s/files/1/2470/9244/products/timelineeventseco_1024x1024.png?v=1607438393', 'In Timeline: Events the players take turns placing a card with a historical event in a timeline on the table. If the card is correctly placed, the card stays, otherwise the card is removed and the player has to take a new one. The winner is the first player to run out of cards. ', 2, 8, 15, 15, 8),
    ('Ticket to Ride Europe', 'https://cdn.shopify.com/s/files/1/2470/9244/products/7202s_jpg_1024x1024.jpg?v=1616844973', 'Ticket to Ride: Europe takes the players on an adventure across Europe, all the way from Edinburgh to Constantinoble. Each player has to build train routes across Europe, where they compete to build the most and best routes across the continent.', 2, 5, 30, 60, 8),
    ('Pandemic', 'https://cdn.shopify.com/s/files/1/2470/9244/products/Pandemic_DK_NO_resize_1024x1024.jpg?v=1616844094', 'In Pandemic the players have to save the world by working together to stop several diseases from spreading all over the world. ', 2, 4, 45, 45, 10),
    ('Monopoly: Stranger Things', 'https://cdn.shopify.com/s/files/1/2470/9244/products/596484-Product-0-I-6379272193782_1024x1024.jpg?v=1658840216', 'Much like the original Monopoly, each player attempts to buy land and gain income from other players, but in this edition strange and terrible things are at play… ', 2, 6, 60, 90, 10),
    ('Monopoly', 'https://cdn.shopify.com/s/files/1/2470/9244/products/monopolydansk_1024x1024.png?v=1637661653', 'Players take turns buying and developing land, and gain income when other players visit their properties. Friendships may or may not be lost in the process. ', 2, 6, 60, 60, 8),
    ('Carcassonne', 'https://cdn.shopify.com/s/files/1/2470/9244/products/Carcassonne2.1_basicgame_right_2020_1024x1024.jpg?v=1616862109', 'Carcassonne is a tile-placement game, where each player draws and places tiles with cities, roads, cloisters or grassland on them. The player can then place one of their meeples on the tile to own and gather points from it. ', 2, 5, 35, 35, 7),
    ('Fluxx 5.0', 'https://cdn.shopify.com/s/files/1/2470/9244/products/fluxx50forside_1024x1024.png?v=1657278148', 'Fluxx is a card game, where the cards played determine the rules of the game, which can change every time a player plays a card.', 2, 6, 5, 30, 8),
    ('Uno', 'https://cdn.shopify.com/s/files/1/2470/9244/products/2976112_7404bd3adfe1_1024x1024.jpg?v=1626250354', 'In this game players race to run out of cards in their hands, while trying to get their opponents to draw more, by playing different cards matching the colour, number or symbol on the top card in the pile on the table.', 2, 10, 30, 30, 6),
    ('Patchwork Nordic', 'https://cdn.shopify.com/s/files/1/2470/9244/products/PatchworkNordic_1024x1024.png?v=1636538743', 'In this game two players compete to build the prettiest, largest and highest scoring patchwork quilt by buying fabric pieces with buttons. ', 2, 2, 15, 30, 8),
    ('Trivial Pursuit Classic Ed.', 'https://cdn.shopify.com/s/files/1/2470/9244/products/download_83_1024x1024.jpg?v=1616841585', 'The classic edition of the Trivial Pursuit trivia games, where each player competes to be the smartest in the group.', 2, 6, 45, 90, 16),
    ('Dino World', 'https://cdn.shopify.com/s/files/1/2470/9244/products/Dinoworldforside_1024x1024.png?v=1659072966', 'An exiting prehistoric hunt, where children can learn about dinosaurs while having fun and capturing prey.', 2, 4, 10, 15, 6),
    ('Jenga', 'https://cdn.shopify.com/s/files/1/2470/9244/products/jenga_1024x1024.png?v=1632922850', 'Jenga is a game, where 54 wooden blocks are stacked in a tower. Each player takes turns removing a wooden block from the tower, and the person who makes the tower collapse is the loser of the game. ', 1, 6, 15, 30, 6),
    ('Exploding Kittens', 'https://cdn.shopify.com/s/files/1/2470/9244/products/original-angled_NORDIC_resize_1024x1024.jpg?v=1616844060', 'This game is an adorable version of russian roulette, where each player takes turns drawing and playing cards until someone draws the exploding kitten. The deck contains cards that let you avoid exploding by letting you peek at cards before you draw, shuffling the deck or forcing your friends to draw multiple cards. ', 2, 5, 15, 15, 7),
    ('Ultimate Werewolf', 'https://cdn.shopify.com/s/files/1/2470/9244/products/download_88_1024x1024.jpg?v=1616841645', 'This is a game of deduction for two teams: the villagers and the werewolves. The werewolves are trying to remain hidden while eliminating the villagers one at a time, while the villagers are trying to figure out who the werewolves are. ', 5, 68, 30, 90, 13),
    ('Cards Against Humanity', 'https://cdn.shopify.com/s/files/1/2470/9244/products/2806050_efc7e160a447_jpg_1024x1024.jpg?v=1616840531', 'Cards Against Humanity is a game, where the players take turns drawing fill-in-the-blanks cards and judging which of their friends have the funniest answer cards to fill in the blanks. ', 4, 30, 30, 30, 17),
    ('Codenames', 'https://cdn.shopify.com/s/files/1/2470/9244/products/codenames_1024x1024.png?v=1638882300', 'Codenames is a party game played in two teams, where the team leader has to lead their teams to victory by describing different words on the board to their team members. ', 2, 8, 15, 15, 14),
    ('What do you Meme? U.K. Edition', 'https://cdn.shopify.com/s/files/1/2470/9244/products/download_94_1024x1024.jpg?v=1616841794', 'What Do You Meme? Is a party game similar to Cards Against Humanity, where the players take turns judging their friends abilities to create the funniest memes. ', 3,6, 90, 90, 18),
    ('Mansions of Madness 2nd Ed.', 'https://cdn.shopify.com/s/files/1/2470/9244/products/mansionsofmadness2nd_1024x1024.png?v=1645004443', 'Mansions of Madness is a cooperative game, where the players have to solve mysteries and fight monsters inspired by H.P. Lovecrafts horror stories. ', 1, 5, 120, 180, 14),
    ('Betrayal at House on the Hill', 'https://cdn.shopify.com/s/files/1/2470/9244/products/1_6_1024x1024.jpg?v=1613474128', 'In this game the players cooperate while exploring a haunted mansion by drawing tiles and encountering frightening spirits and omens until one of the players turns on the rest of the group and they have to fight for their lives. ', 3, 6, 60, 60, 12),
    ('The Lord of the Rings Journeys In Middle-Earth', 'https://cdn.shopify.com/s/files/1/2470/9244/products/TheLordoftheRingsJourneysinMiddle-Earthforside_1024x1024.png?v=1661506426', 'This game lets the players embark on their own adventure in J.R.R. Tolkiens Lord of the Rings universe. The players cooperate to fight the evil threatening the land as part of a thrilling campaign that leads the players through Middle-Earth.', 1, 5, 60, 120, 14),
    ('Gloomhaven', 'https://cdn.shopify.com/s/files/1/2470/9244/products/download_43_1024x1024.jpg?v=1616840787', 'Gloomhaven is a Euro-inspired combat game, where players take on the role of a wandering adventurer with their own skills and reasons for traveling. The players must work together to explore and clear out menacing dungeons and ruins. ', 1, 4, 60, 120, 14),
    ('Twilight Imperium 4th Ed.', 'https://cdn.shopify.com/s/files/1/2470/9244/products/twilight_imperium_1_1024x1024.jpg?v=1618125049', 'Twilight Imperium is a game of galactic conquest, where the players fight for galactic domination with military power, politics and economic bargaining. ', 2, 6, 240, 240, 12),
    ('Star Wars: Rebellion', 'https://cdn.shopify.com/s/files/1/2470/9244/products/starwarsrebellion_1024x1024.png?v=1638886702', 'A board game for Star Wars fans looking to experience the Galactic Civil War like never before. The players control the Galactic Empire or the Rebel Alliance, where each side has different win conditions. ', 2, 4, 180, 240, 14),
    ('Exit: The Forbidden Castle', 'https://cdn.shopify.com/s/files/1/2470/9244/products/det_forbudte_slot_1024x1024.jpg?v=1607628466', 'Exit games are modeled after escape rooms, and in this version the players have to solve puzzles to escape a forbidden castle. ', 1, 4, 45, 90, 12),
    ('Unlock! #2 Mystery Adventures', 'https://cdn.shopify.com/s/files/1/2470/9244/products/unlockmysteryadventures_1024x1024.png?v=1634115414', 'This game features three escape room scenarios, where the players have to cooperate and solve puzzles using cards and the Unlock! companion app.', 1, 6, 45, 75, 10),
    ('Sherlock Holmes Consulting Detective Jack the Ripper & West End Adventures', 'https://cdn.shopify.com/s/files/1/2470/9244/products/SherlockHolmesConsultingDetectivejacktheripperandwestendadventuresforside_1024x1024.png?v=1661153475', 'This game includes ten different murder mysteries to be solved cooperatively by the players, who will discover different clues and talk to different characters in Sherlock Holmes Victorian-era London.', 1, 6, 90, 90, 12), 
    ('Secret Hitler', 'https://cdn.shopify.com/s/files/1/2470/9244/products/Secret-Hitler_1024x1024.jpg?v=1601641614', 'In Secret Hitler each player is randomly assigned the roles of either liberal, fascist or the Secret Hitler. The fascists goal is to make Hitler the chancellor, while the liberals have to stop them from fulfilling their goal and reveal the Secret Hitler, while trying to figure out who among the other players they can trust. ', 5, 10, 45, 45, 13),
    ('Coup', 'https://cdn.shopify.com/s/files/1/2470/9244/products/1_11_1024x1024.jpg?v=1613474204', 'In this game the players need to manipulate, bluff and bribe their way to power to destroy the influence, which is represented by characters, of the other players. ', 2, 6, 15, 15, 13), 
    ('Arkham Horror The Card Game - Revised Core Set', 'https://cdn.shopify.com/s/files/1/2470/9244/products/arkhamhorrorcardgamerevised_1024x1024.png?v=1634019973', 'In Arkham Horror the Card Game the players become characters in the quiet town of Arkham, where you encounter otherworldly evil and ghoulish cults in a game blurring the rules between card game and role-playing.', 1, 4, 45, 180, 14),
    ('Everdell', 'https://cdn.shopify.com/s/files/1/2470/9244/products/gsuh2600__61391.1540338168_1024x1024.jpg?v=1603289572', 'In the valley of Everdell the players play as leaders of groups of critters to establish new cities in the valley. The critters can construct buildings, meet characters and host events while competing with the other players to build the best new city in Everdell.', 1, 4, 40, 80, 13),
    ('Partners', 'https://cdn.shopify.com/s/files/1/2470/9244/products/dsc0055_1024x1024.jpg?v=1618125216', 'Partners is a game for two teams of two players, where each player will use cards to move their pawns around the board and into their finishing zones. In each round the players will switch cards with their partner to help each other beat the other team. ', 4, 4, 60, 60, 12), 
    ('Stratego', 'https://cdn.shopify.com/s/files/1/2470/9244/products/download_74_1024x1024.jpg?v=1616841299', 'Each player controls an army of men and six bombs. The mission is for the player to protect their flag and attempt to capture their opponents.', 2, 2, 45, 45, 8), 
    ('Sequence', 'https://cdn.shopify.com/s/files/1/2470/9244/products/Sequence_Front_Left_resize_1024x1024.jpg?v=1616844275', 'In Sequence the players compete to create rows, columns or diagonals of 5 connected checkers on a board showing the cards of a standard deck in a 10 x 10 pattern.', 2, 12, 10, 30, 7)

-- BoardgameCategory
INSERT INTO bgBoardgameCategory
    ([FK_boardgameid],[FK_categoryid])
VALUES
    (1, 1),
    (1, 2),
    (1, 3),
    (1, 4),

    (2, 1),
    (2, 2),
    (2, 3),
    (2, 5),
    (2, 6),

    (3, 1),
    (3, 7),
    (3, 5),
    (3, 8),
    (3, 9),

    (4, 1),

    (5, 1),
    (5, 2),
    (5, 16),

    (6, 1),
    (6, 3),
    (6, 4),

    (7, 1),
    (7, 3),
    (7, 4),

    (8, 1),
    (8, 6),

    (9, 1),
    (9, 7),
    (9, 5),

    (10, 1),
    (10, 5),
    (10, 10),

    (11, 1),
    (11, 11),
    (11, 2),

    (12, 7),
    (12, 8),

    (13, 10),
    (13, 5),

    (14, 7),

    (15, 7),
    (15, 5),

    (16, 7),
    (16, 5),
    (16, 12),
    (16, 13),

    (17, 7),
    (17, 5),
    (17, 14),
    (17, 15),

    (18, 7),
    (18, 5),
    (18, 12),

    (19, 7),
    (19, 5),
    (19, 14),
    (19, 15),

    (20, 16),
    (20, 17),
    (20, 18),
    (20, 19),
    (20, 20),

    (21, 17),
    (21, 18),
    (21, 16),
    (21, 20),

    (22, 17),
    (22, 21),
    (22, 19),
    (22, 16),

    (23, 2),
    (23, 17),
    (23, 18),
    (23, 21),
    (23, 19),
    (23, 16),

    (24, 2),
    (24, 3),
    (24, 18),
    (24, 4),
    
    (25, 18),
    (25, 19),

    (26, 12),
    (26, 11),
    (26, 16),
    
    (27, 1),
    (27, 5),
    (27, 18),
    (27, 11),
    (27, 16),

    (28, 12),
    (28, 11),
    (28, 16),
    
    (29, 7),
    (29, 13),
    (29, 5),
    (29, 12),
    (29, 14),

    (30, 7),
    (30, 13),
    (30, 5),
    (30, 12),

    (31, 17),
    (31, 5),
    (31, 21),
    (31, 20),
    (31, 16),

    (32, 1),
    (32, 2),
    (32, 5),
    (32, 6),
    (32, 21),
    
    (33, 5),
    (33, 7),

    (34, 1),
    (34, 13),
    (34, 12),
    (34, 2),

    (35, 1),
    (35, 2),
    (35, 5)
GO

-- Role
INSERT INTO bgRole
    ([rolename], [roledescription])
VALUES
    ('admin', 'can add, edit and delete boardgames')
GO

-- Account
INSERT INTO bgAccount
    ([email], [FK_roleid])
VALUES
    ('admin@hotmail.com', 1)
GO

-- password = cat
-- Password
INSERT INTO bgPassword
    ([FK_accountid], [hashedpassword])
VALUES
    (1, '$2a$13$Q2jY.Mj2BDR1cXCuw3.8XuaoacsCg/5qtTmwt66AeNsSJLd/qEBPO')
GO

SELECT * FROM bgBoardgame