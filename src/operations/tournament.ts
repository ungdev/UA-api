import database from '../services/database';
import { Tournament } from '../types';
import { countTeamsWhere } from './team';

export const fetchTournaments = async (): Promise<Tournament[]> => {
  // fetch all tournaments
  const tournaments = await database.tournament.findMany();

  // count all locked teams by tournaments
  const lockedTeamsPerTournaments = await Promise.all(
    tournaments.map((tournament) => {
      return countTeamsWhere({
        tournamentId: tournament.id,
        lockedAt: {
          lte: new Date(),
        },
      });
    }),
  );

  // add count locked teams to tournament object
  return tournaments.map((tournament, index) => ({
    ...tournament,
    lockedTeamsCount: lockedTeamsPerTournaments[index],
  }));
};

export const fetchTournament = (id: string) => {
  return database.tournament.findUnique({ where: { id } });
};
