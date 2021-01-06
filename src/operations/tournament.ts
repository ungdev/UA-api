import { Tournament } from '@prisma/client';
import { TournamentWithLockedTeams } from '../types';
import database from '../services/database';
import { countTeamsWhere } from './team';

export const fetchTournaments = (): Promise<Tournament[]> => {
  return database.tournament.findMany();
};

export const fetchTournament = (id: string) => {
  return database.tournament.findOne({ where: { id } });
};

export const fetchTournamentsWithLockedTeams = async (): Promise<TournamentWithLockedTeams[]> => {
  // fetch all tournaments
  const tournaments: Tournament[] = await fetchTournaments();

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
