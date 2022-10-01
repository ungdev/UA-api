import { faker } from '@faker-js/faker';
import { genSalt, hash } from 'bcryptjs';
import { fetchUser } from '../src/operations/user';
import { Permission, RawUser, User, TournamentId, UserAge, UserType, TransactionState } from '../src/types';
import { fetchTeam } from '../src/operations/team';
import logger from '../src/utils/logger';
import database from '../src/services/database';
import nanoid from '../src/utils/nanoid';
import env from '../src/utils/env';
import { serializePermissions } from '../src/utils/helpers';

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
  discordId?: string;
  /** @default null */
  permissions?: Permission[];
  /** @default null */
  customMessage?: string;
  /** @default UserAge.adult */
  age?: UserAge;
};

const generateFakeUserData = (data: FakeUserData, salt: Promise<string>) => {
  const userId = nanoid();
  const userType = data.type || UserType.player;
  return salt.then(async (awaitedSalt) => ({
    id: userId,
    /* username is generated by the library by appending a random firstname
     * to a random lastname. Numbers, dots or underscores may be inserted between
     * these elements (or as a string padding). Result neither contains single
     * quotes nor regular spaces. See the [complete process here](
     * https://github.com/faker-js/faker/blob/main/src/modules/internet/index.ts#L129)
     * We update the result to match our username regular expression:
     * replace dots with dashes and remove trailing chars */
    username: data.username || faker.internet.userName().replace(/\./g, '-').slice(0, 16),
    firstname: data.firstname || faker.name.firstName(),
    lastname: data.lastname || faker.name.lastName(),
    email: data.email || faker.internet.email(),
    type: userType,
    registerToken: data.confirmed !== false ? null : nanoid(),
    password: await hash(data.password || faker.internet.password(), awaitedSalt),
    discordId: data.discordId || generateFakeDiscordId(),
    permissions: serializePermissions(data.permissions),
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
                  price: 0,
                  forUserId: userId,
                },
              ],
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
  tournament = TournamentId.lol,
  paid = false,
  locked = false,
  name = faker.internet.userName(),
  userPassword,
}: {
  members?: number;
  tournament?: TournamentId;
  paid?: boolean;
  locked?: boolean;
  name?: string;
  userPassword?: string;
} = {}) => {
  const salt = genSalt(env.bcrypt.rounds);
  const [captainData, ...memberData] = await Promise.all(
    // eslint-disable-next-line unicorn/no-new-array
    new Array(members).fill(0).map(() => generateFakeUserData({ password: userPassword, paid }, salt)),
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
      discordRoleId: locked ? generateFakeDiscordId() : undefined,
    },
  });

  logger.verbose(`Created team ${team.name}`);
  return fetchTeam(team.id);
};
