import faker from 'faker';
import prisma, { TournamentId, UserType } from '@prisma/client';
import { createUser, fetchUser, removeUserRegisterToken, setPermissions } from '../src/operations/user';
import { Permission, User } from '../src/types';
import { createTeam, fetchTeam, joinTeam, lockTeam } from '../src/operations/team';
import { forcePay } from '../src/operations/carts';

export const createFakeUser = async ({
  username = faker.internet.userName(),
  firstname = faker.name.firstName(),
  lastname = faker.name.lastName(),
  email = faker.internet.email(),
  password = faker.internet.password(),
  type = UserType.player,
  confirmed = true,
  paid = false,
  permission,
}: {
  username?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  password?: string;
  type?: UserType;
  confirmed?: boolean;
  paid?: boolean;
  permission?: Permission;
} = {}): Promise<User> => {
  const user: prisma.User = await createUser(username, firstname, lastname, email, password, type);

  if (confirmed) {
    await removeUserRegisterToken(user.id);
  }

  if (paid) {
    await forcePay(user.id, user.type);
  }

  if (permission) {
    await setPermissions(user.id, [permission]);
  }

  return fetchUser(user.id);
};

export const createFakeTeam = async ({
  members = 1,
  tournament = TournamentId.lol,
  paid = false,
  locked = false,
}: {
  members?: number;
  tournament?: TournamentId;
  paid?: boolean;
  locked?: boolean;
} = {}) => {
  const user = await createFakeUser({ paid });
  const team = await createTeam(faker.internet.userName(), tournament, user.id);

  if (locked) {
    await lockTeam(team.id);
  }

  // Create new members (minus 1 because the captain is already created)
  for (let index = 0; index < members - 1; index += 1) {
    const partner = await createFakeUser({ paid });
    await joinTeam(team.id, partner);
  }

  return fetchTeam(team.id);
};
