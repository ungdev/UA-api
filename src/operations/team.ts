import { TeamWhereInput } from '@prisma/client';
import database from '../services/database';

export const countTeamsWhere = (teamArguments: TeamWhereInput): Promise<number> => {
  return database.team.count({
    where: teamArguments,
  });
};

export const fetchTeam = (id: string) => {
  return database.team.findOne({ where: { id } });
};

export const fetchTeams = () => {
  return database.team.findMany();
};
