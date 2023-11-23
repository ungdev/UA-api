import { expect } from 'chai';
import request from 'supertest';
import { UserType } from '@prisma/client';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import * as tournamentOperations from '../../src/operations/tournament';
import * as userOperations from '../../src/operations/user';
import database from '../../src/services/database';
import { Error, Team, User } from '../../src/types';
import { createFakeTeam, createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/users';
import { getCaptain } from '../../src/utils/teams';

describe('DELETE /teams/current', () => {
  let captain: User;
  let team: Team;
  let lockedTeam: Team;
  let waitingTeam: Team;
  let waitingTeamToDelete: Team;
  let captainToken: string;
  let lockedTeamCaptainToken: string;
  let waitingTeamToDeleteCaptainToken: string;

  before(async () => {
    const tournament = await tournamentOperations.fetchTournament('rl');
    team = await createFakeTeam({ members: tournament.playersPerTeam, locked: false, tournament: 'rl' });
    for (let index = 0; index < tournament.placesLeft; index++) {
      // We want to get only one, so we can erase the previous value
      lockedTeam = await createFakeTeam({
        members: tournament.playersPerTeam,
        paid: true,
        locked: true,
        tournament: 'rl',
      });
    }
    waitingTeam = await createFakeTeam({ members: tournament.playersPerTeam, paid: true, tournament: 'rl' });
    await teamOperations.lockTeam(waitingTeam.id);
    waitingTeam = await teamOperations.fetchTeam(waitingTeam.id);
    waitingTeamToDelete = await createFakeTeam({ members: tournament.playersPerTeam, paid: true, tournament: 'rl' });
    await teamOperations.lockTeam(waitingTeamToDelete.id);

    captain = getCaptain(team);
    captainToken = generateToken(captain);
    lockedTeamCaptainToken = generateToken(getCaptain(lockedTeam));
    waitingTeamToDeleteCaptainToken = generateToken(getCaptain(waitingTeamToDelete));
  });

  after(async () => {
    await database.team.deleteMany();
    await database.cart.deleteMany();
    await database.orga.deleteMany();
    await database.user.deleteMany();
  });

  it('should error as the token is missing', async () => {
    await request(app).delete(`/teams/current`).send({ name: 'yolo' }).expect(401, { error: Error.Unauthenticated });
  });

  it('should error as the request made by a random', async () => {
    const otherUser = await createFakeUser({ type: UserType.player });
    const otherUserToken = generateToken(otherUser);

    await request(app)
      .delete(`/teams/current`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .expect(403, { error: Error.NotInTeam });
  });

  it('should error as the request is logged as the member of the team', async () => {
    const member = team.players.find((player) => player.id !== team.captainId);
    const memberToken = generateToken(member);

    await request(app)
      .delete(`/teams/current`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403, { error: Error.NotCaptain });
  });

  it('should throw an internal server error', async () => {
    sandbox.stub(teamOperations, 'deleteTeam').throws('Unknown error');

    await request(app)
      .delete(`/teams/current`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should delete the team, but not lock the waiting team, as the team is not locked', async () => {
    // Test with the team that is not in the waiting list
    await request(app).delete(`/teams/current`).set('Authorization', `Bearer ${captainToken}`).expect(204);

    let deletedTeam = await teamOperations.fetchTeam(team.id);
    expect(deletedTeam).to.be.null;

    let updatedCaptain = await userOperations.fetchUser(captain.id);
    expect(updatedCaptain.teamId).to.be.null;
    expect(updatedCaptain.type).to.be.null;

    waitingTeam = await teamOperations.fetchTeam(waitingTeam.id);
    expect(waitingTeam.lockedAt).to.be.null;
    expect(waitingTeam.enteredQueueAt).to.be.not.null;

    // Test with the team that is in the waiting list
    await request(app)
      .delete(`/teams/current`)
      .set('Authorization', `Bearer ${waitingTeamToDeleteCaptainToken}`)
      .expect(204);

    updatedCaptain = await userOperations.fetchUser(waitingTeamToDelete.captainId);
    expect(updatedCaptain.teamId).to.be.null;
    expect(updatedCaptain.type).to.be.null;

    deletedTeam = await teamOperations.fetchTeam(waitingTeamToDelete.id);
    expect(deletedTeam).to.be.null;

    waitingTeam = await teamOperations.fetchTeam(waitingTeam.id);
    expect(waitingTeam.lockedAt).to.be.null;
    expect(waitingTeam.enteredQueueAt).to.be.not.null;
  });

  it('should delete the team, and lock the waiting team, as the team was locked', async () => {
    await request(app).delete(`/teams/current`).set('Authorization', `Bearer ${lockedTeamCaptainToken}`).expect(204);

    const updatedCaptain = await userOperations.fetchUser(lockedTeam.captainId);
    expect(updatedCaptain.teamId).to.be.null;
    expect(updatedCaptain.type).to.be.null;

    const deletedTeam = await teamOperations.fetchTeam(lockedTeam.id);
    expect(deletedTeam).to.be.null;

    waitingTeam = await teamOperations.fetchTeam(waitingTeam.id);
    expect(waitingTeam.lockedAt).to.be.not.null;
    expect(waitingTeam.enteredQueueAt).to.be.null;
  });
});
