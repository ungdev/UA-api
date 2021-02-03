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

describe('PUT /teams/:teamId', () => {
  let captain: User;
  let team: Team;
  let captainToken: string;

  before(async () => {
    team = await createFakeTeam({ members: 2 });

    captain = getCaptain(team);
    captainToken = generateToken(captain);
  });

  after(async () => {
    await database.team.deleteMany();
    await database.user.deleteMany();
  });

  it("should error as the team id doesn't exists", async () => {
    await request(app)
      .put('/teams/A1B2C3')
      .send({ name: 'yolo' })
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(404, { error: Error.TeamNotFound });
  });

  it('should error as the body is incorrect', async () => {
    await request(app)
      .put(`/teams/${team.id}`)
      .send({ fake: 'fake' })
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(400, { error: Error.InvalidBody });
  });

  it('should error as the token is missing', async () => {
    await request(app).put(`/teams/${team.id}`).send({ name: 'yolo' }).expect(401, { error: Error.Unauthenticated });
  });

  it('should error as the request is not logged as the captain of his team', async () => {
    const otherTeam = await createFakeTeam();
    const otherCaptain = getCaptain(otherTeam);
    const otherCaptainToken = generateToken(otherCaptain);

    await request(app)
      .put(`/teams/${team.id}`)
      .send({ name: 'yolo' })
      .set('Authorization', `Bearer ${otherCaptainToken}`)
      .expect(403, { error: Error.NotCaptain });
  });

  it('should error as the request is logged as the member of the team', async () => {
    const member = team.players.find((player) => player.id !== team.captainId);
    const memberToken = generateToken(member);

    await request(app)
      .put(`/teams/${team.id}`)
      .send({ name: 'yolo' })
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(403, { error: Error.NotCaptain });
  });

  it('should throw an internal server error', async () => {
    sandbox.stub(teamOperations, 'updateTeam').throws('Unknown error');

    await request(app)
      .put(`/teams/${team.id}`)
      .send({ name: 'yolo' })
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should error as the team is locked', async () => {
    const lockedTeam = await createFakeTeam({ members: 5, locked: true });
    const lockedCaptain = getCaptain(lockedTeam);
    const lockedToken = generateToken(lockedCaptain);

    await request(app)
      .put(`/teams/${lockedTeam.id}`)
      .send({ name: 'yolo' })
      .set('Authorization', `Bearer ${lockedToken}`)
      .expect(403, { error: Error.TeamLocked });
  });

  it('should update the team', async () => {
    const { body } = await request(app)
      .put(`/teams/${team.id}`)
      .send({ name: 'yolo' })
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(200);

    const updatedTeam = await teamOperations.fetchTeam(team.id);

    expect(body.name).to.be.equal('yolo');
    expect(updatedTeam.name).to.be.equal('yolo');

    // Check if the object was filtered
    expect(body.updatedAt).to.be.undefined;
  });
});
