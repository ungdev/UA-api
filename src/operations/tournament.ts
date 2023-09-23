import { Caster, PrismaPromise } from '@prisma/client';
import database from '../services/database';
import { PrimitiveTournament, Tournament, TournamentId } from '../types';
import { fetchTeams } from './team';

export const formatTournament = async (
  tournament: PrimitiveTournament & { casters: Caster[] },
): Promise<Tournament> => {
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

  const teams = await fetchTeams(tournament.id);

  return {
    ...tournament,
    lockedTeamsCount,
    teams,
    placesLeft,
  };
};

export const fetchTournament = async (id: TournamentId): Promise<Tournament> => {
  const tournament = await database.tournament.findUnique({ where: { id }, include: { casters: true } });

  return formatTournament(tournament);
};

export const fetchTournaments = async (): Promise<Tournament[]> => {
  // fetch all tournaments withs their casters
  const tournaments = await database.tournament.findMany({
    include: {
      casters: true,
    },
  });

  return Promise.all(tournaments.map(formatTournament));
};

export const updateTournament = (
  id: TournamentId,
  data: {
    name?: string;
    maxPlayers?: number;
    playersPerTeam?: number;
    cashprize?: number;
    cashprizeDetails?: string;
    displayCashprize?: boolean;
    format?: string;
    infos?: string;
    displayCasters?: boolean;
    display?: boolean;
  },
): PrismaPromise<PrimitiveTournament> =>
  database.tournament.update({
    where: { id },
    data: { ...data, casters: undefined },
  });
