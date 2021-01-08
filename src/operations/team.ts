import prisma, { TeamWhereInput } from '@prisma/client';
import { nanoid } from 'nanoid';
import database from '../services/database';

export const countTeamsWhere = (teamArguments: TeamWhereInput): Promise<number> => {
  return database.team.count({
    where: teamArguments,
  });
};

export const fetchTeam = (id: string) => {
  return database.team.findOne({ where: { id } });
};

export const fetchTeams = (tournamentId: string) => {
  return database.team.findMany({
    where: {
      tournamentId,
    },
  });
};

export const createTeam = (name: string, tournamentId: string, captainId: string) => {
  database.$;
  return database.team.create({
    data: {
      id: nanoid(),
      name,
      captain: {
        connect: { id: captainId },
      },
      tournament: {
        connect: { id: tournamentId },
      },
    },
  });
};
