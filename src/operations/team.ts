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
import { formatUser, userInclusions } from './user';
import { setupDiscordTeam } from '../utils/discord';
import { fetchTournament } from './tournament';

const teamInclusions = {
  users: {
    include: userInclusions,
  },
  askingUsers: {
    include: userInclusions,
  },
};

export const getPositionInQueue = (team: Team): Promise<number | undefined> => {
  if (!team.enteredQueueAt) return null;
  return database.team.count({
    where: { AND: [{ enteredQueueAt: { not: null } }, { enteredQueueAt: { lte: team.enteredQueueAt } }] },
  });
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

  const team = await fetchTeam(teamId);
  const tournament = await fetchTournament(team.tournamentId);
  let updatedTeam: PrimitiveTeamWithPrimitiveUsers;

  if (tournament.placesLeft > 0) {
    // Lock the team the usual way
    updatedTeam = await database.team.update({
      data: {
        lockedAt: new Date(),
      },
      where: {
        id: teamId,
      },
      include: teamInclusions,
    });
    // Setup team on Discord
    await setupDiscordTeam(team, tournament);
  } else {
    // Put the team in the waiting list
    updatedTeam = await database.team.update({
      data: {
        enteredQueueAt: new Date(),
      },
      where: {
        id: teamId,
      },
      include: teamInclusions,
    });
  }

  return formatTeam(updatedTeam);
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

  // Verify if team need to be locked
  const newTeam = formatTeam(team);
  const tournament = await fetchTournament(newTeam.tournamentId);
  if (newTeam.players.length === tournament.playersPerTeam && newTeam.players.every((player) => player.hasPaid)) {
    await lockTeam(newTeam.id);
  }

  return newTeam;
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

export const askJoinTeam = async (teamId: string, userId: string, userType: UserType) => {
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

export const unlockTeam = async (teamId: string) => {
  const updatedTeam = await database.team.update({
    data: {
      lockedAt: null,
      enteredQueueAt: null,
    },
    where: {
      id: teamId,
    },
    include: teamInclusions,
  });

  const tournament = await fetchTournament(updatedTeam.tournamentId);
  // We freed a place, so there is at least one place left
  // (except if the team was already in the queue, but then we want to skip the condition, so that's fine)
  if (tournament.placesLeft === 1) {
    // We unlock the first team in the queue
    const firstTeamInQueue = await database.team.findFirst({
      where: {
        enteredQueueAt: {
          not: null,
        },
      },
      orderBy: {
        enteredQueueAt: 'asc',
      },
    });

    if (firstTeamInQueue) {
      // The team is no longer in the queue
      await database.team.update({
        data: {
          enteredQueueAt: null,
        },
        where: {
          id: firstTeamInQueue.id,
        },
      });

      // We lock the team
      await lockTeam(firstTeamInQueue.id);
    }
  }

  return formatTeam(updatedTeam);
};

const prismaRequestJoinTeam = (teamId: string, user: User, newUserType?: UserType): PrismaPromise<RawUser> =>
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

export const joinTeam = async (teamId: string, user: User, newUserType?: UserType): Promise<RawUser> => {
  const updatedUser = await prismaRequestJoinTeam(teamId, user, newUserType);
  // Check if we need to lock the team
  // First, check the type of the user and that he has paid
  if (newUserType !== 'player' || !user.hasPaid) {
    return updatedUser;
  }
  const team = await fetchTeam(teamId);
  const tournament = await fetchTournament(team.tournamentId);
  // Then, check if the team is full and that every player has paid
  if (team.players.length !== tournament.playersPerTeam || !team.players.every((player) => player.hasPaid)) {
    return updatedUser;
  }
  // If we are still there, we passed all the tests, so we can lock the team
  await lockTeam(teamId);

  return updatedUser;
};

const prismaRequestKickUser = (user: User): PrismaPromise<RawUser> =>
  database.user.update({
    data: {
      team: {
        disconnect: true,
      },
      type: null,
    },
    where: {
      id: user.id,
    },
  });

export const kickUser = async (user: User): Promise<RawUser> => {
  // Warning: for this version of prisma, this method is not idempotent. It will throw an error if there is no asking team. It should be solved in the next versions
  // Please correct this if this issue is closed and merged https://github.com/prisma/prisma/issues/3069
  if (user.type === 'player') {
    await unlockTeam(user.teamId);
  }
  return prismaRequestKickUser(user);
};

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
  ] = [prismaRequestKickUser(user), prismaRequestJoinTeam(team.id, targetUser, user.type)];

  // If he is the captain, change the captain
  if (team.captainId === user.id) {
    transactions.push(promoteUser(team.id, targetUser.id));
  }

  return database.$transaction(transactions);
};

export const deleteTeam = async (team: Team) => {
  if (team.lockedAt) {
    await unlockTeam(team.id);
  }
  return database.$transaction([
    database.user.updateMany({
      where: { teamId: team.id },
      data: {
        type: null,
      },
    }),
    database.team.delete({
      where: { id: team.id },
    }),
  ]);
};
