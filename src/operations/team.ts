import type { PrismaPromise } from '@prisma/client';
import database from '../services/database';
import {
  Team,
  User,
  UserType,
  PrimitiveTeam,
  RawUser,
  RawUserWithCartItems,
  PrimitiveTeamWithPrimitiveUsers,
  PrimitiveTeamWithPartialTournament,
} from '../types';
import nanoid from '../utils/nanoid';
import { countCoaches, formatUser, userInclusions } from './user';

const teamMaxCoachCount = 2;

const teamInclusions = {
  users: {
    include: userInclusions,
  },
  askingUsers: {
    include: userInclusions,
  },
};

export const formatTeam = (
  team: PrimitiveTeam & { users: RawUserWithCartItems[]; askingUsers: RawUserWithCartItems[] },
): Team => {
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

export const fetchTeamWithTournament = (id: string): Promise<PrimitiveTeamWithPartialTournament> =>
  database.team.findUnique({
    where: { id },
    include: {
      tournament: {
        select: {
          name: true,
          id: true,
        },
      },
    },
  });

export const fetchTeams = async (tournamentId: string): Promise<Team[]> => {
  const teams = await database.team.findMany({
    where: {
      tournamentId,
    },
    include: teamInclusions,
  });

  return teams.map(formatTeam);
};

export const createTeam = async (
  name: string,
  tournamentId: string,
  captainId: string,
  pokemonPlayerId: string | undefined,
  userType: UserType,
): Promise<Team> => {
  // Update the user to create a transaction update (update the user AND create the team)
  await database.user.update({
    data: {
      team: {
        create: {
          id: nanoid(),
          name,
          pokemonPlayerId,
          captain: {
            connect: {
              id: captainId,
            },
          },
          tournament: {
            connect: { id: tournamentId },
          },
        },
      },
      askingTeam: {
        disconnect: true,
      },
      type: userType,
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
  database.$transaction([
    database.user.updateMany({
      where: { teamId },
      data: {
        type: null,
      },
    }),
    database.team.delete({
      where: { id: teamId },
    }),
  ]);

export const askJoinTeam = async (teamId: string, userId: string, userType: UserType) => {
  // We check the amount of coaches at that point
  const teamCoachCount = await countCoaches(teamId);
  if (userType === UserType.coach && teamCoachCount >= teamMaxCoachCount)
    throw Object.assign(new Error('Query cannot be executed: max count of coach reached already'), {
      code: 'API_COACH_MAX_TEAM',
    });

  // Then we create the join request when it is alright
  const updatedUser = await database.user.update({
    data: {
      askingTeam: {
        connect: {
          id: teamId,
        },
      },
      type: userType,
    },
    where: {
      id: userId,
    },
    include: userInclusions,
  });

  return formatUser(updatedUser);
};

export const deleteTeamRequest = (userId: string): PrismaPromise<RawUser> =>
  // Warning: for this version of prisma, this method is not idempotent. It will throw an error if there is no asking team. It should be solved in the next versions
  // Please correct this if this issue is closed and merged https://github.com/prisma/prisma/issues/3069
  database.user.update({
    data: {
      askingTeam: {
        disconnect: true,
      },
      type: null,
    },
    where: {
      id: userId,
    },
  });

export const kickUser = (userId: string): PrismaPromise<RawUser> =>
  // Warning: for this version of prisma, this method is not idempotent. It will throw an error if there is no asking team. It should be solved in the next versions
  // Please correct this if this issue is closed and merged https://github.com/prisma/prisma/issues/3069
  database.user.update({
    data: {
      team: {
        disconnect: true,
      },
      type: null,
    },
    where: {
      id: userId,
    },
  });

export const promoteUser = (teamId: string, newCaptainId: string): PrismaPromise<PrimitiveTeamWithPrimitiveUsers> =>
  database.team.update({
    data: {
      captain: {
        connect: { id: newCaptainId },
      },
    },
    where: {
      id: teamId,
    },
    include: teamInclusions,
  });

export const joinTeam = (teamId: string, user: User, newUserType?: UserType): PrismaPromise<RawUser> =>
  database.user.update({
    data: {
      team: {
        connect: {
          id: teamId,
        },
      },
      askingTeam: {
        disconnect: true,
      },
      type: newUserType,
    },
    where: {
      id: user.id,
    },
  });

export const replaceUser = (
  user: User,
  targetUser: User,
  team: Team,
): Promise<[RawUser, RawUser, PrimitiveTeamWithPrimitiveUsers?]> => {
  // Create the first transaction to replace the user
  const transactions: [
    PrismaPromise<RawUser>,
    PrismaPromise<RawUser>,
    PrismaPromise<PrimitiveTeamWithPrimitiveUsers>?,
  ] = [kickUser(user.id), joinTeam(team.id, targetUser, user.type)];

  // If he is the captain, change the captain
  if (team.captainId === user.id) {
    transactions.push(promoteUser(team.id, targetUser.id));
  }

  return database.$transaction(transactions);
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
