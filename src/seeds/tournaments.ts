import { getConnection, InsertResult } from 'typeorm';
import TournamentModel from '../models/tournament';

export default (): Promise<InsertResult> => {
  const tournaments = [
    {
      id: 'lol',
      name: 'League of Legends',
      maxPlayers: 160,
      playersPerTeam: 5,
    },
    {
      id: 'csgo',
      name: 'Counter-Strike : Global Offensive',
      maxPlayers: 80,
      playersPerTeam: 5,
    },
    {
      id: 'valorant',
      name: 'Valorant',
      maxPlayers: 80,
      playersPerTeam: 5,
    },
    {
      id: 'rl',
      name: 'Rocket League',
      maxPlayers: 48,
      playersPerTeam: 3,
    },
    {
      id: 'ssbu',
      name: 'Super Smash Bros Ultimate',
      maxPlayers: 64,
      playersPerTeam: 1,
    },
    {
      id: 'tft',
      name: 'Teamfight Tactics',
      maxPlayers: 16,
      playersPerTeam: 1,
    },
  ];

  return getConnection().createQueryBuilder().insert().into(TournamentModel).values(tournaments).execute();
};
