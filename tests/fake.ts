import { joinTeam } from '../src/operations/team';
import { fetchTournaments } from '../src/operations/tournament';
import * as settings from '../src/operations/settings';
import database from '../src/services/database';
import { Permission, UserType } from '../src/types';
import env from '../src/utils/env';
import { createFakeTeam, createFakeUser } from './utils';

(async () => {
  // Reject the usage in production
  if (env.production) {
    throw new Error("Can't execute this command in production");
  }

  const defaultPassword = 'uttarena';

  // Delete the data to make the command idempotent
  await database.cartItem.deleteMany();
  await database.cart.deleteMany();
  await database.log.deleteMany();
  await database.team.deleteMany();
  await database.user.deleteMany();

  // For each tournaments, create fake teams
  const tournaments = await fetchTournaments();

  await Promise.all(
    tournaments.map(async (tournament) => {
      // Create a fake team of 1 member, 2 members, 3...
      for (let players = 1; players <= tournament.playersPerTeam; players += 1) {
        await createFakeTeam({
          members: players,
          locked: false,
          tournament: tournament.id,
          userPassword: defaultPassword,
        });
      }

      // Create a locked team
      await createFakeTeam({
        members: tournament.playersPerTeam,
        locked: true,
        tournament: tournament.id,
        userPassword: defaultPassword,
      });

      // Create a team with coaches
      const teamWithCoaches = await createFakeTeam({
        members: tournament.playersPerTeam,
        tournament: tournament.id,
        userPassword: defaultPassword,
      });
      const coach = await createFakeUser({ type: UserType.coach, password: defaultPassword });
      await joinTeam(teamWithCoaches.id, coach);
    }),
  );

  // Create 10 users without team and 30 orgas
  for (let standAloneUser = 0; standAloneUser < 10; standAloneUser += 1) {
    await createFakeUser({ type: undefined, password: defaultPassword });
  }

  // Add fake users (with sufficient length to be allowed in the database)
  await createFakeUser({
    username: 'ua_admin',
    password: defaultPassword,
    email: 'admin@ua.fr',
    permissions: [Permission.admin],
  });
  await createFakeUser({
    username: 'ua_entry',
    password: defaultPassword,
    email: 'entry@ua.fr',
    permissions: [Permission.entry],
  });
  await createFakeUser({
    username: 'ua_anim',
    password: defaultPassword,
    email: 'anim@ua.fr',
    permissions: [Permission.anim],
  });

  // Set login and shop to allowed
  await settings.setLoginAllowed(true);
  await settings.setShopAllowed(true);

  await database.$disconnect();
})();
