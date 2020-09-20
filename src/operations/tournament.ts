import { Tournament } from '@prisma/client';
import database from '../utils/database';

export const fetchTournaments = (): Promise<Tournament[]> => {
  return database.tournament.findMany();
};
