import prisma, { TournamentId } from '@prisma/client';
import database from '../services/database';
import { PrimitiveUser, Team, User } from '../types';
import nanoid from '../utils/nanoid';
import { formatUser, userInclusions } from './user';

const teamInclusions = {
  users: {
    include: userInclusions,
  },
  askingUsers: {
    include: userInclusions,
  },
};

export const formatTeam = (team: prisma.Team & { users: PrimitiveUser[]; askingUsers: PrimitiveUser[] }): Team => {
  if (!team) return null;

  const players = team.users.filter((player) => player.type === 'player');
  const coaches = team.users.filter((coach) => coach.type === 'coach');

  return {
    ...team,
    users: undefined,
    players: players.map(formatUser),
    coaches: coaches.map(formatUser),
    askingUsers: team.askingUsers.map(formatUser),
  };
};

export const fetchTeam = async (id: string): Promise<Team> => {
  const team = await database.team.findUnique({ where: { id }, include: teamInclusions });

  return formatTeam(team);
};

export const fetchTeams = async (tournamentId: TournamentId): Promise<Team[]> => {
  const teams = await database.team.findMany({
    where: {
      tournamentId,
    },
    include: teamInclusions,
  });

  return teams.map(formatTeam);
};

export const createTeam = async (name: string, tournamentId: TournamentId, captainId: string): Promise<Team> => {
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
    include: teamInclusions,
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

export const deleteTeam = (teamId: string) =>
  database.team.delete({
    where: {
      id: teamId,
    },
  });

export const askJoinTeam = async (teamId: string, userId: string) => {
  const updatedUser = await database.user.update({
    data: {
      askingTeam: {
        connect: {
          id: teamId,
        },
      },
    },
    where: {
      id: userId,
    },
    include: userInclusions,
  });

  return formatUser(updatedUser);
};

export const deleteTeamRequest = (userId: string) =>
  // Warning: for this version of prisma, this method is not idempotent. It will throw an error if there is no asking team. It should be solved in the next versions
  // Please correct this if this issue is closed and merged https://github.com/prisma/prisma/issues/3069
  database.user.update({
    data: {
      askingTeam: {
        disconnect: true,
      },
    },
    where: {
      id: userId,
    },
  });

export const kickUser = (userId: string) =>
  // Warning: for this version of prisma, this method is not idempotent. It will throw an error if there is no asking team. It should be solved in the next versions
  // Please correct this if this issue is closed and merged https://github.com/prisma/prisma/issues/3069
  database.user.update({
    data: {
      team: {
        disconnect: true,
      },
    },
    where: {
      id: userId,
    },
  });

export const promoteUser = (teamId: string, newCaptainId: string) =>
  database.team.update({
    data: {
      captain: {
        connect: { id: newCaptainId },
      },
    },
    where: {
      id: teamId,
    },
  });

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

export const lockTeam = async (teamId: string) => {
  // We want to group all queries in one transaction. It is not possible currently, but keep being updated on prisma

  const askingUsers = await database.user.findMany({
    where: {
      askingTeamId: teamId,
    },
  });

  await database.$transaction(
    askingUsers.map((user) =>
      database.user.update({
        data: {
          askingTeam: {
            disconnect: true,
          },
        },
        where: {
          id: user.id,
        },
      }),
    ),
  );

  const updatedTeam = await database.team.update({
    data: {
      lockedAt: new Date(),
    },
    where: {
      id: teamId,
    },
    include: teamInclusions,
  });

  return formatTeam(updatedTeam);
};
