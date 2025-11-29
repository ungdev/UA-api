import userOperations from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import database from '../services/database';
import nanoid from '../utils/nanoid';
import env from '../utils/env';
import {
  User,
  UserSearchQuery,
  TransactionState,
  UserAge,
  UserType,
  RawUserWithCartItems,
  RawUser,
  UserPatchBody,
  RawUserWithTeamAndTournamentInfo,
  UserWithTeamAndTournamentInfo,
  Permission,
  Orga,
  RawOrgaWithUserData,
  RawOrgaWithDetailedRoles,
} from '../types';
import { deserializePermissions, serializePermissions } from '../utils/helpers';
import { fetchAllItems } from './item';
import { deleteFile } from './upload';
import logger from '../utils/logger';
import { fetchTournament } from './tournament';

export const userInclusions = {
  cartItems: {
    include: {
      cart: true,
    },
  },
  attendant: true,
  attended: true,
};

export const formatUser = (user: RawUserWithCartItems): User => {
  if (!user) return null;

  if (user.cartItems.some((cartItem) => cartItem.forUserId !== user.id))
    throw new Error('Error just to make sure of something');

  const hasPaid = user.cartItems.some(
    (cartItem) => cartItem.itemId.startsWith(`ticket-`) && cartItem.cart.transactionState === TransactionState.paid,
  );

  return {
    ...user,
    hasPaid,
    permissions: deserializePermissions(user.permissions),
  };
};

export const formatUserWithTeamAndTournament = (
  primitiveUser: RawUserWithTeamAndTournamentInfo,
): UserWithTeamAndTournamentInfo => {
  const user = formatUser(primitiveUser);

  return {
    ...user,
    team: primitiveUser.team,
  };
};

export const formatOrga = (orga: RawUser & { orga: RawOrgaWithDetailedRoles }): Orga => ({
  id: orga.id,
  name: orga.orga.displayName ? `${orga.firstname} ${orga.lastname}` : undefined,
  username: orga.orga.displayUsername ? orga.username : undefined,
  photoFilename: orga.orga.displayPhoto ? orga.orga.photoFilename : undefined,
  roles: orga.orga.roles,
  displayName: orga.orga.displayName,
  displayPhoto: orga.orga.displayPhoto,
  displayUsername: orga.orga.displayUsername,
  mainCommission: orga.orga.mainCommission,
});

export const filterOrgaData = (orga: RawOrgaWithDetailedRoles) =>
  orga
    ? {
        mainCommission: orga.mainCommissionId,
        roles: orga.roles.map((role) => {
          const commissionWithoutPosition = { ...role.commission };
          delete commissionWithoutPosition.position;
          return { ...role, commission: commissionWithoutPosition };
        }),
      }
    : null;

export const hasUserAlreadyPaidForAnotherTicket = async (user: User, tournamentId: string, userType: UserType) => {
  const currentTickets = user.cartItems.filter(
    (cartItem) =>
      cartItem.cart.transactionState === 'paid' &&
      cartItem.itemId.startsWith('ticket-') &&
      cartItem.itemId !== 'ticket-attendant',
  );
  const tickets = (await fetchAllItems()).filter((item) => item.category === 'ticket');
  const tournament = tournamentId ? await fetchTournament(tournamentId) : { ffsu: false };
  const requiredTicket = tournament.ffsu
    ? tickets.find((ticket) => ticket.id === `ticket-${userType}-ffsu`)
    : (tickets.find((ticket) => ticket.id === `ticket-${userType}-${tournamentId}`) ??
      tickets.find((ticket) => ticket.id === `ticket-${userType}`));
  return (
    currentTickets.length > 0 && !currentTickets.some((currentTicket) => currentTicket.price === requiredTicket.price)
  );
};

export const fetchUser = async (parameterId: string, key = 'id'): Promise<User> => {
  const user = await database.user.findUnique({
    where: { [key]: parameterId } as unknown as Prisma.UserWhereUniqueInput,
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
export const fetchUsers = async (
  query: UserSearchQuery,
  page: number,
): Promise<[UserWithTeamAndTournamentInfo[], number]> => {
  const filter: Omit<Prisma.UserFindManyArgs, 'select' | 'include' | 'distinct'> = {
    where: {
      ...(query.search
        ? {
            OR: [
              { firstname: { contains: query.search } },
              { lastname: { contains: query.search } },
              { username: { contains: query.search } },
              { email: { contains: query.search } },
              { id: { contains: query.search } },
              { discordId: { contains: query.search } },
              {
                team: {
                  name: { contains: query.search },
                },
              },
                    {
              id: {
                 in: (
                    await database.orgaRole.findMany({
                      where: {
                        OR: [
                          { userId: { contains: query.search } },
                          { commissionId: { contains: query.search } },
                          ],
                        },
                    select: { userId: true },
                })
            ).map(role => role.userId),
    },
  },
            ],
          }
        : {}),

      team: {
        tournamentId: query.tournament || undefined,
        ...(query.locked
          ? {
              lockedAt: query.locked === 'true' ? { not: null } : null,
            }
          : {}),
      },

      ...(query.payment === 'true'
        ? {
            cartItems: {
              some: {
                cart: {
                  transactionState: 'paid',
                },
                itemId: {
                  startsWith: 'ticket-',
                },
                quantity: {
                  gt: 0,
                },
              },
            },
          }
        : // eslint-disable-next-line unicorn/no-nested-ternary
          query.payment === 'false'
          ? {
              cartItems: {
                none: {
                  cart: {
                    transactionState: 'paid',
                  },
                  itemId: {
                    startsWith: 'ticket-',
                  },
                  quantity: {
                    gt: 0,
                  },
                },
              },
            }
          : {}),

      id: query.userId || undefined,
      type: query.type || undefined,
      age: query.age || undefined,
      AND: query.permissions?.split(',').map((permission) => ({ permissions: { contains: permission } })),
      place: query.place ? { startsWith: query.place } : undefined,

      // Checks first if scanned exists, and then if it is true of false
      scannedAt: query.scan ? (query.scan === 'true' ? { not: null } : null) : undefined,
    },
  };
  const [users, count] = await database.$transaction([
    database.user.findMany({
      ...filter,
      include: {
        ...userInclusions,
        team: {
          include: {
            tournament: {
              select: {
                name: true,
                id: true,
              },
            },
          },
        },
      },
      skip: page * env.api.itemsPerPage,
      take: env.api.itemsPerPage,
      orderBy: [
        // Users not in a team will be returned before because NULL is considered as
        // inferior to any other value
        // In sql, this can be done using `CASE` but prisma doesn't support it for now
        // cf. https://github.com/prisma/prisma/issues/4368 (that states postgresql syntax)
        {
          team: {
            tournamentId: 'asc',
          },
        },
        {
          team: {
            createdAt: 'asc',
          },
        },
        {
          team: {
            id: 'asc',
          },
        },
        {
          type: 'asc',
        },
      ],
    }),
    database.user.count({ where: filter.where }),
  ]);

  return [users.map(formatUserWithTeamAndTournament), count];
};

/** Returns orga users */
export const fetchOrgas = async (): Promise<Orga[]> => {
  const orgas = await database.user.findMany({
    where: { permissions: { contains: 'orga' } },
    include: {
      orga: {
        include: {
          roles: { select: { commission: true, commissionRole: true } },
          mainCommission: true,
        },
      },
    },
  });
  return orgas
    .map((orga) => {
      try {
        return formatOrga(orga);
      } catch (error) {
        logger.error(`Error while formatting orga ${orga.id}`, error);
        return null;
      }
    })
    .filter((orga) => orga !== null);
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
  permissions?: Permission[];
}): Promise<RawUser> => {
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
      permissions: serializePermissions(user.permissions),
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

export const updateUserFfsu = async (
  userId: string,
  data: {
    ffsuLicense: string | null;
  },
): Promise<User> => {
  const user = await database.user.update({
    data: {
      ffsuLicense: data.ffsuLicense,
    },
    where: {
      id: userId,
    },
    include: userInclusions,
  });

  return formatUser(user);
};

export const updateAdminUser = async (user: User, updates: UserPatchBody): Promise<User> => {
  const userId = user.id;
  if (updates.permissions && !updates.permissions.includes(Permission.orga)) {
    await database.orga.deleteMany({ where: { userId } });
  }
  const shouldConnectToOrga =
    (!updates.permissions && user.permissions.includes(Permission.orga)) ||
    (updates.permissions && updates.permissions.includes(Permission.orga));
  const updatedUser = await database.user.update({
    data: {
      type: updates.type,
      permissions: updates.permissions ? serializePermissions(updates.permissions) : undefined,
      place: updates.place,
      discordId: updates.discordId,
      customMessage: updates.customMessage,
      age: updates.age,
      email: updates.email,
      firstname: updates.firstname,
      lastname: updates.lastname,
      username: updates.username,
      team:
        updates.type === UserType.spectator
          ? {
              disconnect: true,
            }
          : undefined,
      orga: {
        connectOrCreate: shouldConnectToOrga
          ? {
              where: { userId },
              create: {},
            }
          : undefined,
        update: shouldConnectToOrga
          ? {
              where: {
                userId,
              },
              data: {
                mainCommissionId: updates.orgaMainCommission,
                roles: {
                  connectOrCreate: updates.orgaRoles?.map((orgaRole) => ({
                    where: {
                      userId_commissionId: { userId, commissionId: orgaRole.commission },
                    },
                    create: {
                      commissionRole: orgaRole.commissionRole,
                      commission: { connect: { id: orgaRole.commission } },
                    },
                  })),
                  update: updates.orgaRoles?.map((orgaRole) => ({
                    where: {
                      userId_commissionId: { userId, commissionId: orgaRole.commission },
                    },
                    data: { commissionRole: orgaRole.commissionRole },
                  })),
                  deleteMany: {
                    userId,
                    NOT: {
                      OR: updates.orgaRoles?.map((orgaRole) => ({
                        commissionId: orgaRole.commission,
                      })),
                    },
                  },
                },
              },
            }
          : undefined,
      },
    },
    where: { id: userId },
    include: userInclusions,
  });

  return formatUser(updatedUser);
};

export const createAttendant = (
  referrerId: string,
  firstname: string,
  lastname: string,
): Promise<RawUserWithCartItems> =>
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

export const removeUserRegisterToken = (userId: string): Promise<RawUser> =>
  database.user.update({
    data: {
      registerToken: null,
    },
    where: {
      id: userId,
    },
  });

export const removeUserResetToken = (userId: string): Promise<RawUser> =>
  database.user.update({
    data: {
      resetToken: null,
    },
    where: {
      id: userId,
    },
  });

export const generateResetToken = (userId: string): Promise<RawUser> =>
  database.user.update({
    data: {
      resetToken: nanoid(),
    },
    where: {
      id: userId,
    },
  });

export const scanUser = (userId: string): Promise<RawUser> =>
  database.user.update({
    data: {
      scannedAt: new Date(),
    },
    where: {
      id: userId,
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

export const deleteUser = (id: string): Promise<RawUser> => database.user.delete({ where: { id } });

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

/**
 * Fetches the users that have paid for a ticket. It should get each spectators that have paid, and each players and coachs that have paid only if they are in a team.
 * @returns the users that have paid for a ticket
 */
export const getPaidAndValidatedUsers = () =>
  database.user.findMany({
    where: {
      discordId: {
        not: null,
      },
      email: {
        not: null,
      },
      OR: [
        {
          team: {
            lockedAt: {
              not: null,
            },
          },
        },
        {
          type: UserType.spectator,
        },
      ],
      cartItems: {
        some: {
          itemId: {
            startsWith: 'ticket-',
          },
          cart: {
            paidAt: {
              not: null,
            },
            transactionState: TransactionState.paid,
          },
        },
      },
    },
  });

export const getNextPaidAndValidatedUserBatch = async (batchMaxSize: number = env.email.maxMailsPerBatch) => {
  const users = await database.user.findMany({
    where: {
      discordId: {
        not: null,
      },
      email: {
        not: null,
      },
      ticketMailSent: false,
      OR: [{ team: { lockedAt: { not: null } } }, { type: UserType.spectator }],
      cartItems: {
        some: {
          itemId: {
            startsWith: 'ticket-',
          },
          cart: {
            paidAt: {
              not: null,
            },
            transactionState: TransactionState.paid,
          },
        },
      },
    },
    orderBy: {
      place: {
        sort: 'asc',
        nulls: 'last',
      },
    },
    take: batchMaxSize,
  });
  await database.user.updateMany({
    where: {
      id: {
        in: users.map((user) => user.id),
      },
    },
    data: {
      ticketMailSent: true,
    },
  });
  return users;
};

/** Generates a file name to store the photo of an orga.
 * The file name is in the form :
 * <lastname>-<firstname>-<userId>-<randomString>
 * We append a random string to make sure you can't find it easily (without an admin access to the file manager)
 */
export const generateOrgaPhotoFilename = (user: User) =>
  `${user.lastname.replaceAll(/\W/g, '')}-${user.firstname.replaceAll(/\W/g, '')}-${user.id}-${nanoid() + nanoid()}`;

export const fetchOrgaData = (userId: string): Promise<RawOrgaWithDetailedRoles> =>
  database.orga.findUnique({
    where: { userId },
    include: { roles: { select: { commissionRole: true, commission: true } }, mainCommission: true },
  }) ?? null;

export const fetchOrga = async (user: RawUser | User): Promise<RawOrgaWithUserData> => {
  const orga = await fetchOrgaData(user.id);
  return orga ? { ...user, ...orga } : null;
};

export const updateTrombi = async (
  user: User,
  displayName: boolean,
  displayPhoto: boolean,
  displayUsername: boolean,
) => {
  const orga = await fetchOrga(user);
  // First delete the old file, if any
  if (orga.photoFilename) {
    try {
      await deleteFile(`orga/${orga.photoFilename}.webp`);
    } catch {
      logger.warn(
        `Le fichier orga/${orga.photoFilename}.webp n'existe pas. Cette erreur n'est pas forcément une erreur de l'API`,
      );
    }
  }
  const filename = generateOrgaPhotoFilename(user);
  await database.orga.update({
    where: { userId: user.id },
    data: {
      displayName,
      displayPhoto,
      photoFilename: filename,
      displayUsername,
    },
  });
  return filename;
};
