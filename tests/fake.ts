import { UserType } from '.prisma/client';
import { joinTeam } from '../src/operations/team';
import { fetchTournaments } from '../src/operations/tournament';
import database from '../src/services/database';
import { Permission } from '../src/types';
import { createFakeTeam, createFakeUser } from './utils';

(async () => {
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
      // Create a fake team of 0 member, 1 member, 2...
      for (let players = 0; players <= tournament.playersPerTeam; players += 1) {
        await createFakeTeam({ members: players, locked: false, tournament: tournament.id });
      }

      // Create a locked team
      await createFakeTeam({ members: tournament.playersPerTeam, locked: true, tournament: tournament.id });

      // Create a team with coaches
      const teamWithCoaches = await createFakeTeam({ members: tournament.playersPerTeam, tournament: tournament.id });
      const coach = await createFakeUser({ type: UserType.coach });
      await joinTeam(teamWithCoaches.id, coach);
    }),
  );

  // Create 10 users without team and 30 orgas
  for (let standAloneUser = 0; standAloneUser < 10; standAloneUser += 1) {
    await createFakeUser({ type: null });
    await createFakeUser({ type: UserType.orga, permission: Permission.admin });
    await createFakeUser({ type: UserType.orga, permission: Permission.entry });
    await createFakeUser({ type: UserType.orga, permission: Permission.anim });
  }

  await database.$disconnect();
})();
