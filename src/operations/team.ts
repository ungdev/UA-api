import { TeamWhereInput } from '@prisma/client';
import database from '../utils/database';

export const countTeamsWhere = (teamArguments: TeamWhereInput): Promise<number> => {
  return database.team.count({
    where: teamArguments,
  });
};

export const fetchTeam = (id: string) => {
  return database.team.findOne({ where: { id } });
};
