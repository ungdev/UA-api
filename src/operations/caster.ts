import { nanoid } from 'nanoid';
import { Caster, PrismaPromise, TournamentId } from '@prisma/client';
import database from '../services/database';

export const removeAllCastersFromTournament = (tournamentId: TournamentId): boolean => {
  database.caster.deleteMany({
    where: {
      tournamentId,
    },
  });

  return true;
};

export const addCasterToTournament = (tournamentId: TournamentId, name: string): PrismaPromise<Caster> =>
  database.caster.create({
    data: {
      id: nanoid(),
      tournamentId,
      name,
    },
  });
