import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as teamOperations from '../../src/operations/team';
import database from '../../src/services/database';
import { Error, Team, User } from '../../src/types';
import { createFakeTeam } from '../utils';
import { generateToken } from '../../src/utils/user';
import { getCaptain } from '../../src/utils/teams';

describe('DELETE /teams/:teamId', () => {
  let captain: User;
  let team: Team;
  let captainToken: string;

  before(async () => {
    team = await createFakeTeam(2);

    captain = getCaptain(team);
    captainToken = generateToken(captain);
  });

  after(async () => {
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it("should error as the team id doesn't exists", async () => {
    await request(app)
      .delete('/teams/A1B2C3')
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(404, { error: Error.TeamNotFound });
  });

  it('should error as the token is missing', async () => {
    await request(app).delete(`/teams/${team.id}`).send({ name: 'yolo' }).expect(401, { error: Error.Unauthenticated });
  });

  it('should error as the request is not logged as the captain of his team', async () => {
    const otherTeam = await createFakeTeam();
    const otherCaptain = getCaptain(otherTeam);
    const otherCaptainToken = generateToken(otherCaptain);

    await request(app)
      .delete(`/teams/${team.id}`)
      .set('Authorization', `Bearer ${otherCaptainToken}`)
      .expect(403, { error: Error.NotCaptain });
  });

  it('should error as the request is logged as the member of the team', async () => {
    const member = team.players.find((player) => player.id !== team.captainId);
    const memberToken = generateToken(member);

    await request(app)
      .delete(`/teams/${team.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403, { error: Error.NotCaptain });
  });

  it('should throw an internal server error', async () => {
    sandbox.stub(teamOperations, 'deleteTeam').throws('Unknown error');

    await request(app)
      .delete(`/teams/${team.id}`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should delete the team', async () => {
    await request(app).delete(`/teams/${team.id}`).set('Authorization', `Bearer ${captainToken}`).expect(204);

    const deletedTeam = await teamOperations.fetchTeam(team.id);
    expect(deletedTeam).to.be.null;
  });
});
