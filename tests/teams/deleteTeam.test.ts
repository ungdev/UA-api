import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import database from '../../src/services/database';
import { Error, Team, User } from '../../src/types';
import { createFakeTeam, createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/user';
import { getCaptain } from '../../src/utils/teams';
import { fetchUser } from '../../src/operations/user';

describe('DELETE /teams/current', () => {
  let captain: User;
  let team: Team;
  let captainToken: string;

  before(async () => {
    team = await createFakeTeam({ members: 2 });

    captain = getCaptain(team);
    captainToken = generateToken(captain);
  });

  after(async () => {
    await database.log.deleteMany();
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it('should error as the token is missing', async () => {
    await request(app).delete(`/teams/current`).send({ name: 'yolo' }).expect(401, { error: Error.Unauthenticated });
  });

  it('should error as the request made by a random', async () => {
    const otherUser = await createFakeUser();
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

  it('should error as the team is locked', async () => {
    const lockedTeam = await createFakeTeam({ members: 5, locked: true });
    const lockedCaptain = getCaptain(lockedTeam);
    const lockedToken = generateToken(lockedCaptain);

    await request(app)
      .delete(`/teams/current`)
      .set('Authorization', `Bearer ${lockedToken}`)
      .expect(403, { error: Error.TeamLocked });
  });

  it('should delete the team', async () => {
    await request(app).delete(`/teams/current`).set('Authorization', `Bearer ${captainToken}`).expect(204);

    const deletedTeam = await teamOperations.fetchTeam(team.id);
    expect(deletedTeam).to.be.null;

    const updatedCaptain = await fetchUser(captain.id);
    expect(updatedCaptain.teamId).to.be.null;
  });
});
