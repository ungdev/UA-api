import prisma, { Prisma } from '@prisma/client';
import database from '../services/database';
import { PrimitiveUser, Team, User } from '../types';
import nanoid from '../utils/nanoid';
import { formatUser } from './user';

const teamInclusions = {
  users: {
    include: {
      cartItems: true,
    },
  },
  askingUsers: {
    include: {
      cartItems: true,
    },
  },
};

export const formatTeam = (team: prisma.Team & { users: PrimitiveUser[]; askingUsers: PrimitiveUser[] }): Team => {
  if (!team) return null;

  return {
    ...team,
    users: team.users.map(formatUser),
    askingUsers: team.users.map(formatUser),
  };
};

export const fetchTeam = async (id: string): Promise<Team> => {
  const team = await database.team.findUnique({ where: { id }, include: teamInclusions });

  return formatTeam(team);
};

export const fetchTeams = (tournamentId: string) => {
  return database.team.findMany({
    where: {
      tournamentId,
    },
  });
};

export const createTeam = async (name: string, tournamentId: string, captainId: string): Promise<Team> => {
  // Update the user to create a transaction update (update the user AND create the team)
  await database.user.update({
    data: {
      team: {
        create: {
          id: nanoid(),
          name,
          captain: {
            connect: { id: captainId },
          },
          tournament: {
            connect: { id: tournamentId },
          },
        },
      },
    },

    where: {
      id: captainId,
    },
  });

  const team = await database.team.findUnique({
    where: {
      captainId,
    },
    include: {
      users: {
        include: {
          cartItems: true,
        },
      },
      askingUsers: {
        include: {
          cartItems: true,
        },
      },
    },
  });

  return formatTeam(team);
};

export const updateTeam = async (teamId: string, name: string): Promise<Team> => {
  const team = await database.team.update({
    data: {
      name,
    },
    where: {
      id: teamId,
    },
    include: teamInclusions,
  });

  return formatTeam(team);
};

export const deleteTeam = (teamId: string) => {
  return database.team.delete({
    where: {
      id: teamId,
    },
  });
};

export const joinTeam = async (teamId: string, user: User) => {
  // For this version of prisma, we need to fetch to check if there was already a askingTeam. It should be solved in the next versions
  // Please correct this if this issue is close and merged https://github.com/prisma/prisma/issues/3069

  let updateAskingTeamId = {};

  if (user.askingTeamId) {
    updateAskingTeamId = {
      askingTeam: {
        disconnect: true,
      },
    };
  }

  await database.user.update({
    data: {
      team: {
        connect: {
          id: teamId,
        },
      },
      ...updateAskingTeamId,
    },
    where: {
      id: user.id,
    },
  });
};
