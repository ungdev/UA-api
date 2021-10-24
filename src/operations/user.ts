import userOperations from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import database from '../services/database';
import nanoid from '../utils/nanoid';
import env from '../utils/env';
import {
  Permission,
  PrimitiveUser,
  User,
  UserSearchQuery,
  UserWithTeam,
  TransactionState,
  UserAge,
  UserType,
  PrimitiveTeam,
} from '../types';
import { serializePermissions } from '../utils/helpers';

export const userInclusions = {
  cartItems: {
    include: {
      cart: true,
    },
  },
  attendant: true,
  attended: true,
};

export const formatUser = (user: PrimitiveUser): User => {
  if (!user) return null;

  if (user.cartItems.some((cartItem) => cartItem.forUserId !== user.id))
    throw new Error('Error just to make sure of something');

  const hasPaid = user.cartItems.some(
    (cartItem) => cartItem.itemId === `ticket-${user.type}` && cartItem.cart.transactionState === TransactionState.paid,
  );

  return {
    ...user,
    hasPaid,
  };
};

export const formatUserWithTeam = (primitiveUser: PrimitiveUser & { team: PrimitiveTeam }): UserWithTeam => {
  const user = formatUser(primitiveUser);

  return {
    ...user,
    team: primitiveUser.team,
  };
};

export const fetchUser = async (parameterId: string, key = 'id'): Promise<User> => {
  const user = await database.user.findUnique({
    where: { [key]: parameterId },
    include: userInclusions,
  });

  return formatUser(user);
};

/**
 * Fetches {@link User Users}. These {@link User users} objects include their {@link prisma.Team team}.
 * @param query the query to search users against
 * @param page the number of the requested page
 * @returns {Promise<[UserWithTeam[], number]>} the entries corresponding to the page,
 * along with count of entries matching the query.
 */
export const fetchUsers = async (query: UserSearchQuery, page: number): Promise<[UserWithTeam[], number]> => {
  const filter: Omit<Prisma.UserFindManyArgs, 'select' | 'include'> = {
    where: {
      OR: [
        { firstname: query.search ? { contains: query.search } : undefined },
        { lastname: query.search ? { contains: query.search } : undefined },
        { username: query.search ? { contains: query.search } : undefined },
        { email: query.search ? { contains: query.search } : undefined },
        {
          team: {
            name: query.search ? { contains: query.search } : undefined,
          },
        },
        {
          // Always true condition in order to avoid no result as OR filter
          email: query.search ? undefined : { not: null },
        },
      ],

      team: {
        tournamentId: query.tournament || undefined,
      },

      id: query.userId || undefined,
      type: query.type || undefined,
      permissions: query.permission ? { contains: query.permission } : undefined,
      place: query.place ? { startsWith: query.place } : undefined,

      // Checks first if scanned exists, and then if it is true of false
      scannedAt: query.scanned ? (query.scanned === 'true' ? { not: null } : null) : undefined,
    },
  };
  const [users, count] = await database.$transaction([
    database.user.findMany({
      ...filter,
      include: {
        ...userInclusions,
        team: true,
      },
      skip: page * env.api.itemsPerPage,
      take: env.api.itemsPerPage,
    }),
    database.user.count(filter),
  ]);

  return [users.map(formatUserWithTeam), count];
};

export const createUser = async (user: {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  age: UserAge;
  discordId?: string;
  type?: UserType;
  customMessage?: string;
}) => {
  const salt = await userOperations.genSalt(env.bcrypt.rounds);
  const hashedPassword = await userOperations.hash(user.password, salt);
  return database.user.create({
    data: {
      id: nanoid(),
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      type: user.type,
      discordId: user.discordId,
      password: hashedPassword,
      registerToken: nanoid(),
      customMessage: user.customMessage,
      age: user.age,
    },
  });
};

export const updateUser = async (
  userId: string,
  data: {
    username: string;
    newPassword: string;
  },
): Promise<User> => {
  const salt = await userOperations.genSalt(env.bcrypt.rounds);
  const hashedPassword = data.newPassword ? await userOperations.hash(data.newPassword, salt) : undefined;

  const user = await database.user.update({
    data: {
      username: data.username,
      password: hashedPassword,
    },
    where: {
      id: userId,
    },
    include: userInclusions,
  });

  return formatUser(user);
};

export const updateAdminUser = async (
  userId: string,
  updates: {
    type?: UserType;
    permissions?: Permission[];
    place?: string;
    discordId?: string;
    customMessage?: string;
    age?: UserAge;
  },
): Promise<User> => {
  const user = await database.user.update({
    data: {
      type: updates.type,
      permissions: serializePermissions(updates.permissions),
      place: updates.place,
      discordId: updates.discordId,
      customMessage: updates.customMessage,
      age: updates.age,
      team:
        updates.type === UserType.spectator
          ? {
              disconnect: true,
            }
          : undefined,
    },
    where: { id: userId },
    include: userInclusions,
  });

  return formatUser(user);
};

export const createAttendant = (referrerId: string, firstname: string, lastname: string) =>
  database.user.update({
    data: {
      attendant: {
        create: {
          id: nanoid(),
          firstname,
          lastname,
          type: UserType.attendant,
          age: UserAge.adult,
        },
      },
    },
    where: {
      id: referrerId,
    },
    include: userInclusions,
  });

export const removeUserRegisterToken = (userId: string) =>
  database.user.update({
    data: {
      registerToken: null,
    },
    where: {
      id: userId,
    },
  });

export const removeUserResetToken = (userId: string) =>
  database.user.update({
    data: {
      resetToken: null,
    },
    where: {
      id: userId,
    },
  });

export const generateResetToken = (userId: string) =>
  database.user.update({
    data: {
      resetToken: nanoid(),
    },
    where: {
      id: userId,
    },
  });

export const scanUser = (userId: string) =>
  database.user.update({
    data: {
      scannedAt: new Date(),
    },
    where: {
      id: userId,
    },
  });

export const setPermissions = (userId: string, permissions: Permission[]) =>
  database.user.update({
    where: {
      id: userId,
    },
    data: {
      permissions: permissions.join(','),
    },
  });

export const changePassword = async (user: User, newPassword: string) => {
  const salt = await userOperations.genSalt(env.bcrypt.rounds);
  const hashedPassword = await userOperations.hash(newPassword, salt);

  return database.user.update({
    where: {
      id: user.id,
    },
    data: {
      password: hashedPassword,
    },
  });
};

export const deleteUser = (id: string) => database.user.delete({ where: { id } });

/**
 * Counts the coaches in a chosen team. If team is not specified,
 * they are counted globally.
 * @param teamId the id of the team to count coaches in
 * @returns the amount of coaches in the given team
 */
export const countCoaches = (teamId: string) =>
  database.user.count({
    where: {
      AND: [
        {
          type: UserType.coach,
        },
        {
          OR: [
            {
              teamId,
            },
            {
              askingTeamId: teamId,
            },
          ],
        },
      ],
    },
  });
