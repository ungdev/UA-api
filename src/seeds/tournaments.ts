import { getConnection } from 'typeorm';
import { Tournament } from '../models/tournament';

export default () => {
  const tournaments = [
    {
      id: 1,
      name: 'League of Legends (pro)',
      shortName: 'LoL (pro)',
      maxPlayers: 80,
      playersPerTeam: 5,
    },
    {
      id: 2,
      name: 'League of Legends (amateur)',
      shortName: 'LoL (amateur)',
      maxPlayers: 80,
      playersPerTeam: 5,
    },
    {
      id: 3,
      name: 'Counter Strike : Global Offensive',
      shortName: 'CS:GO',
      maxPlayers: 80,
      playersPerTeam: 5,
    },
    {
      id: 4,
      name: 'Super Smash Bros Ultimate',
      shortName: 'SSBU',
      maxPlayers: 64,
      playersPerTeam: 1,
    },
    {
      id: 5,
      name: 'osu!',
      shortName: 'osu!',
      maxPlayers: 24,
      playersPerTeam: 1,
    },
    {
      id: 6,
      name: 'Libre',
      shortName: 'Libre',
      maxPlayers: 24,
      playersPerTeam: 1,
    },
  ];

  return getConnection().createQueryBuilder().insert().into(Tournament).values(tournaments).execute();
};
