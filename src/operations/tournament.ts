import prisma from '@prisma/client';
import database from '../services/database';
import { Tournament } from '../types';

export const formatTournament = async (tournament: prisma.Tournament): Promise<Tournament> => {
  if (!tournament) return null;

  const lockedTeamsCount = await database.team.count({
    where: {
      tournamentId: tournament.id,
      lockedAt: {
        lte: new Date(),
      },
    },
  });

  const slots = tournament.maxPlayers / tournament.playersPerTeam;

  // Calculate the number of places left. We use the max function to ensure the number is always positive
  // It is a case that never should happend
  const placesLeft = Math.max(0, slots - lockedTeamsCount);

  return {
    ...tournament,
    lockedTeamsCount,
    placesLeft,
  };
};

export const fetchTournament = async (id: string): Promise<Tournament> => {
  const tournament = await database.tournament.findUnique({ where: { id } });

  return formatTournament(tournament);
};

export const fetchTournaments = async (): Promise<Tournament[]> => {
  // fetch all tournaments
  const tournaments = await database.tournament.findMany();

  return Promise.all(tournaments.map(formatTournament));
};
