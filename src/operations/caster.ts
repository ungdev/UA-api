import { nanoid } from 'nanoid';
import { Caster, PrismaPromise } from '@prisma/client';
import database from '../services/database';

export const removeAllCastersFromTournament = (tournamentId: string) =>
  database.caster.deleteMany({
    where: {
      tournamentId,
    },
  });

export const addCasterToTournament = (tournamentId: string, name: string): PrismaPromise<Caster> =>
  database.caster.create({
    data: {
      id: nanoid(),
      tournamentId,
      name,
    },
  });
