import { faker } from '@faker-js/faker';
import { genSalt, hash } from 'bcryptjs';
import { ItemCategory, RoleInCommission } from '@prisma/client';
import sharp from 'sharp';
import { assert } from 'chai';
import { fetchUser } from '../src/operations/user';
import { Permission, RawUser, User, UserAge, UserType, TransactionState } from '../src/types';
import { fetchTeam } from '../src/operations/team';
import logger from '../src/utils/logger';
import database from '../src/services/database';
import nanoid from '../src/utils/nanoid';
import env from '../src/utils/env';
import { serializePermissions } from '../src/utils/helpers';
import { fetchTournament } from '../src/operations/tournament';
import * as discord from './discord';

export const generateFakeDiscordId = () => `${Math.floor(Date.now() * (1 + Math.random()))}`;

type FakeUserData = {
  username?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  password?: string;
  /** @default UserType.player */
  type?: UserType;
  /** @default true */
  confirmed?: boolean;
  /** @default false */
  paid?: boolean;
  pricePaid?: number;
  discordId?: string;
  /** @default null */
  permissions?: Permission[];
  /** @default null */
  customMessage?: string;
  /** @default UserAge.adult */
  age?: UserAge;
  orgaRoles?: Array<{ commission: string; role: RoleInCommission }>;
  orgaDisplayPhoto?: boolean;
  orgaDisplayName?: boolean;
  orgaDisplayUsername?: boolean;
  orgaPhotoFilename?: string;
  orgaMainCommissionId?: string;
};

const generateFakeUserData = (data: FakeUserData, salt: Promise<string>) => {
  const userId = nanoid();
  const userType = data.type;
  const permissions = serializePermissions(data.permissions);
  const discordId = discord.registerMember(data.discordId);
  return salt.then(async (awaitedSalt) => ({
    id: userId,
    /* username is generated by the library by appending a random firstname
     * to a random lastname. Numbers, dots or underscores may be inserted between
     * these elements (or as a string padding). Result neither contains single
     * quotes nor regular spaces. See the [complete process here](
     * https://github.com/faker-js/faker/blob/main/src/modules/internet/index.ts#L129)
     * We update the result to match our username regular expression:
     * replace dots with dashes and remove trailing chars */
    username: data.username || faker.internet.userName().replace('.', '-').slice(0, 12) + nanoid(4),
    firstname: data.firstname || faker.person.firstName(),
    lastname: data.lastname || faker.person.lastName(),
    email: data.email || faker.internet.email(),
    type: userType,
    registerToken: data.confirmed === false ? nanoid() : null,
    password: await hash(data.password || faker.internet.password(), awaitedSalt),
    discordId,
    permissions,
    customMessage: data.customMessage,
    age: data.age || UserAge.adult,
    carts: data.paid
      ? {
          create: {
            id: nanoid(),
            transactionState: TransactionState.paid,
            paidAt: new Date(),
            cartItems: {
              create: [
                {
                  id: nanoid(),
                  itemId: `ticket-${userType}`,
                  quantity: 1,
                  price: data.pricePaid || 0,
                  forUserId: userId,
                },
              ],
            },
          },
        }
      : undefined,
    orga: permissions?.includes(Permission.orga)
      ? {
          create: {
            displayPhoto: data.orgaDisplayPhoto,
            displayName: data.orgaDisplayName,
            photoFilename: data.orgaPhotoFilename,
            displayUsername: data.orgaDisplayUsername,
            mainCommissionId: data.orgaMainCommissionId,
            roles: {
              create: data.orgaRoles?.map((role) => ({
                commission: { connect: { id: role.commission } },
                commissionRole: role.role,
              })),
            },
          },
        }
      : undefined,
  }));
};

/**
 * Generates a fake user with one single call to the database.
 */
export const createFakeUser = async (userData: FakeUserData = {}): Promise<User> => {
  const generatedUserData = await generateFakeUserData(userData, genSalt(env.bcrypt.rounds));
  const user: RawUser = await database.user.create({
    data: generatedUserData,
  });
  logger.verbose(`Created user ${user.username}`);

  return fetchUser(user.id);
};

/**
 * Generates a fake team (of the given member count) with one single call to the database.
 */
export const createFakeTeam = async ({
  members = 1,
  tournament,
  paid = false,
  locked = false,
  name = faker.internet.userName() + faker.number.int(),
  userPassword,
}: {
  members?: number;
  tournament: string;
  paid?: boolean;
  locked?: boolean;
  name?: string;
  userPassword?: string;
}) => {
  assert(members >= 1, 'Cannot create a team with less than 1 member');
  const salt = genSalt(env.bcrypt.rounds);
  const [captainData, ...memberData] = await Promise.all(
    // eslint-disable-next-line unicorn/no-new-array
    new Array(members)
      .fill(0)
      .map(() => generateFakeUserData({ password: userPassword, paid, type: UserType.player }, salt)),
  );

  const team = await database.team.create({
    data: {
      id: nanoid(),
      name,
      tournament: {
        connect: { id: tournament },
      },
      captain: {
        create: captainData,
      },
      users: {
        create: memberData,
        connect: {
          id: captainData.id,
        },
      },
      lockedAt: locked ? new Date() : undefined,
      discordRoleId: locked ? discord.registerRole() : undefined,
      discordTextChannelId: locked ? discord.createChannel() : undefined,
      discordVoiceChannelId: locked ? discord.createChannel() : undefined,
    },
  });

  logger.verbose(`Created team ${team.name}`);
  return fetchTeam(team.id);
};

export const createFakePartner = async ({
  name = faker.company.name(),
  description = faker.lorem.paragraph(),
  link = faker.internet.url(),
  display = true,
  position = 0,
}: {
  name?: string;
  description?: string;
  link?: string;
  display?: boolean;
  position?: number;
}) => {
  const partner = await database.partner.create({
    data: {
      id: nanoid(),
      name,
      description,
      link,
      display,
      position,
    },
  });

  logger.verbose(`Created partner ${name}`);
  return partner;
};

export const createFakeTournament = async ({
  id = nanoid(),
  name = faker.word.noun(),
  playersPerTeam = 1,
  coachesPerTeam = 0,
  maxTeams = 1,
}: {
  id?: string;
  name?: string;
  playersPerTeam?: number;
  coachesPerTeam?: number;
  maxTeams?: number;
} = {}) => {
  await database.tournament.create({
    data: {
      id,
      name,
      maxPlayers: playersPerTeam * maxTeams,
      playersPerTeam,
      coachesPerTeam,
      discordRoleId: discord.registerRole(),
    },
  });
  logger.verbose(`Created tournament ${name}`);
  return fetchTournament(id);
};

export const createFakeItem = ({
  name,
  category = 'supplement',
  price = 1000,
  stock,
  availableFrom,
  availableUntil,
}: {
  name: string;
  category?: ItemCategory;
  price?: number;
  stock?: number;
  availableFrom?: Date;
  availableUntil?: Date;
}) => database.item.create({ data: { id: nanoid(), category, name, price, stock, availableFrom, availableUntil } });

export const createFakeCart = ({
  userId,
  transactionState = 'paid',
  items,
}: {
  userId: string;
  transactionState?: TransactionState;
  items: Array<{ itemId: string; quantity: number; price: number }>;
}) =>
  database.cart.create({
    data: {
      id: nanoid(),
      userId,
      transactionState,
      transactionId: 123,
      cartItems: {
        createMany: {
          data: items.map(({ itemId, quantity, price }) => ({
            id: nanoid(),
            itemId,
            quantity,
            price,
            forUserId: userId,
          })),
        },
      },
    },
  });

export function generateDummyJpgBuffer(size: number) {
  const sizeInPixels = Math.ceil(Math.sqrt(size / 3));
  return sharp({
    create: {
      width: sizeInPixels,
      height: sizeInPixels,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .jpeg()
    .toBuffer();
}

export function generateDummyPngBuffer(size: number) {
  const sizeInPixels = Math.ceil(Math.sqrt(size / 4));
  return sharp({
    create: {
      width: sizeInPixels,
      height: sizeInPixels,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}
