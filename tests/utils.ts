import faker from 'faker';
import prisma, { TournamentId, UserAge, UserType } from '@prisma/client';
import { createUser, fetchUser, removeUserRegisterToken, setPermissions } from '../src/operations/user';
import { Permission, User } from '../src/types';
import { createTeam, fetchTeam, joinTeam, lockTeam } from '../src/operations/team';
import { forcePay } from '../src/operations/carts';
import logger from '../src/utils/logger';
import database from '../src/services/database';

export const generateFakeDiscordId = () => `${Math.floor(Date.now() * (1 + Math.random()))}`;

export const createFakeUser = async ({
  /* username is generated by the library by appending a random firstname
   * to a random lastname. Numbers, dots or underscores may be inserted between
   * these elements (or as a string padding). Result neither contains single
   * quotes nor regular spaces. See the [complete process here](
   * https://github.com/Marak/faker.js/blob/master/lib/internet.js#L76)
   * We update the result to match our username regular expression:
   * replace dots with dashes and remove trailing chars */
  username = faker.internet.userName().replace(/\./g, '-').slice(0, 16),
  firstname = faker.name.firstName(),
  lastname = faker.name.lastName(),
  email = faker.internet.email(),
  password = faker.internet.password(),
  type = UserType.player,
  confirmed = true,
  paid = false,
  discordId = generateFakeDiscordId(),
  permission,
  customMessage,
  age = UserAge.adult,
}: {
  username?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  password?: string;
  type?: UserType;
  confirmed?: boolean;
  paid?: boolean;
  discordId?: string;
  permission?: Permission;
  customMessage?: string;
  age?: UserAge;
} = {}): Promise<User> => {
  const user: prisma.User = await createUser({
    username,
    firstname,
    lastname,
    email,
    password,
    discordId,
    type,
    customMessage,
    age,
  });
  logger.verbose(`Created user ${user.username}`);

  if (confirmed) {
    await removeUserRegisterToken(user.id);
  }

  if (paid) {
    await forcePay(user);
  }

  if (permission) {
    await setPermissions(user.id, [permission]);
  }

  return fetchUser(user.id);
};

export const createFakeTeam = async ({
  members = 1,
  tournament = TournamentId.lolCompetitive,
  paid = false,
  locked = false,
  name,
  userPassword,
}: {
  members?: number;
  tournament?: TournamentId;
  paid?: boolean;
  locked?: boolean;
  name?: string;
  userPassword?: string;
} = {}) => {
  const password = userPassword || faker.internet.password();

  const user = await createFakeUser({ paid, password });
  const team = await createTeam(name || faker.internet.userName(), tournament, user.id, UserType.player);
  logger.verbose(`Created team ${team.name}`);

  if (locked) {
    await lockTeam(team.id);
    await database.team.update({ data: { discordRoleId: generateFakeDiscordId() }, where: { id: team.id } });
  }

  // Create new members (minus 1 because the captain is already created)
  for (let index = 0; index < members - 1; index += 1) {
    const partner = await createFakeUser({ paid, password });
    await joinTeam(team.id, partner, UserType.player);
  }

  return fetchTeam(team.id);
};
