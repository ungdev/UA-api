import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app';
import { sandbox } from '../setup';
import * as responses from '../../src/utils/responses';
import database from '../../src/services/database';
import { Error, Team, Tournament, User } from '../../src/types';
import { createFakeTeam, createFakeTournament, createFakeUser } from '../utils';
import { generateToken } from '../../src/utils/users';
import { getCaptain } from '../../src/utils/teams';
import { fetchTeam, lockTeam } from '../../src/operations/team';
import { sleep } from '../../src/utils/helpers';
import { UserType } from "@prisma/client";

describe('GET /teams/current', () => {
  let tournament: Tournament;

  let team: Team;
  let captain: User;
  let captainToken: string;

  let secondTeamInQueue: Team;
  let captainTokenSecondTeam: string;

  before(async () => {
    tournament = await createFakeTournament({
      id: 'smalltournament',
      name: 'Small tournament',
      playersPerTeam: 2,
      coachesPerTeam: 2,
      maxTeams: 1,
    });
    team = await createFakeTeam({ members: 2, tournament: tournament.id, locked: true, paid: true });
    for (let index = 0; index < 3; index++) {
      await sleep(1);
      const queuedTeam = await createFakeTeam({ members: 2, tournament: tournament.id, paid: true });
      await lockTeam(queuedTeam.id);
      if (index === 1) {
        secondTeamInQueue = await fetchTeam(queuedTeam.id);
      }
    }

    captain = getCaptain(team);
    captainToken = generateToken(captain);
    captainTokenSecondTeam = generateToken(getCaptain(secondTeamInQueue));
  });

  after(async () => {
    await database.cartItem.deleteMany();
    await database.cart.deleteMany();
    await database.team.deleteMany();
    await database.user.deleteMany();
    await database.tournament.delete({ where: { id: tournament.id } });
  });

  it('should error as the token is missing', async () => {
    await request(app).get(`/teams/current`).expect(401, { error: Error.Unauthenticated });
  });

  it('should error as the logged user is not is a team', async () => {
    const otherUser = await createFakeUser({type: UserType.player});
    const otherUserToken = generateToken(otherUser);

    await request(app)
      .get(`/teams/current`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .expect(403, { error: Error.NotInTeam });
  });

  it('should succeed as the request is logged as the member of the team', async () => {
    const member = team.players.find((player) => player.id !== team.captainId);
    const memberToken = generateToken(member);

    const response = await request(app).get(`/teams/current`).set('Authorization', `Bearer ${memberToken}`).expect(200);

    expect(response.body.name).to.be.equal(team.name);
    expect(response.body.positionInQueue).to.be.null;
  });

  it('should throw an internal server error', async () => {
    sandbox.stub(responses, 'success').throws('Unknown error');

    await request(app)
      .get(`/teams/current`)
      .set('Authorization', `Bearer ${captainToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should succeed as the captain and return the right position in the queue', async () => {
    const { body } = await request(app)
      .get(`/teams/current`)
      .set('Authorization', `Bearer ${captainTokenSecondTeam}`)
      .expect(200);

    expect(body.name).to.be.equal(secondTeamInQueue.name);
    expect(body.positionInQueue).to.be.equal(2);

    // Check if the object was filtered
    expect(body.updatedAt).to.be.undefined;
  });
});
