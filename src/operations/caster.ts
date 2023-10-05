import { nanoid } from 'nanoid';
import { Caster, PrismaPromise, TournamentId } from '@prisma/client';
import database from '../services/database';

export const removeAllCastersFromTournament = (tournamentId: (typeof TournamentId)[keyof typeof TournamentId]) =>
  database.caster.deleteMany({
    where: {
      tournamentId,
    },
  });

export const addCasterToTournament = (
  tournamentId: (typeof TournamentId)[keyof typeof TournamentId],
  name: string,
): PrismaPromise<Caster> =>
  database.caster.create({
    data: {
      id: nanoid(),
      tournamentId,
      name,
    },
  });
