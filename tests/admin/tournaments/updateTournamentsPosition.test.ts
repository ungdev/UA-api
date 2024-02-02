import { expect } from 'chai';
import request from 'supertest';
import app from '../../../src/app';
import { sandbox } from '../../setup';
import * as tournamentOperations from '../../../src/operations/tournament';
import database from '../../../src/services/database';
import { Error, Permission, Tournament, User, UserType } from '../../../src/types';
import { createFakeTournament, createFakeUser } from '../../utils';
import { generateToken } from '../../../src/utils/users';

describe('PATCH /admin/tournaments', () => {
  let nonAdminUser: User;
  let admin: User;
  let adminToken: string;
  let tournament0: Tournament;
  let tournament1: Tournament;

  let validBody: {
    tournaments: {
      id: string;
      position: number;
    }[];
  };

  after(async () => {
    await database.orga.deleteMany();
    await database.user.deleteMany();
  });

  before(async () => {
    admin = await createFakeUser({ permissions: [Permission.admin] });
    nonAdminUser = await createFakeUser({ type: UserType.player });
    adminToken = generateToken(admin);

    tournament0 = await createFakeTournament();
    tournament1 = await createFakeTournament();

    validBody = {
      tournaments: [
        {
          id: tournament0.id,
          position: 1,
        },
        {
          id: tournament1.id,
          position: 0,
        },
      ],
    };
  });

  it('should error as the user is not authenticated', () =>
    request(app).patch(`/admin/tournaments`).send(validBody).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(nonAdminUser);
    return request(app)
      .patch(`/admin/tournaments`)
      .send(validBody)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(tournamentOperations, 'updateTournamentsPosition').throws('Unexpected error');

    await request(app)
      .patch(`/admin/tournaments`)
      .send(validBody)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it("should throw an error as tournament's id does not exist", async () => {
    await request(app)
      .patch(`/admin/tournaments`)
      .send({
        tournaments: [
          {
            id: 'aaaaaa',
            position: 1,
          },
          {
            id: 'aaaaaa',
            position: 0,
          },
        ],
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404, { error: Error.NotFound });
  });

  it("should throw an error as tournament's position is not a number", async () => {
    await request(app)
      .patch(`/admin/tournaments`)
      .send({
        tournaments: [
          {
            id: tournament0.id,
            position: 'aaaaaa',
          },
          {
            id: tournament1.id,
            position: 0,
          },
        ],
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('should successfully update the tournaments', async () => {
    const result = await request(app)
      .patch(`/admin/tournaments`)
      .send(validBody)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      result.body.find((a: { id: string; position: number }) => a.id === validBody.tournaments[0].id).position,
    ).to.equal(validBody.tournaments[0].position);
    expect(
      result.body.find((a: { id: string; position: number }) => a.id === validBody.tournaments[1].id).position,
    ).to.equal(validBody.tournaments[1].position);
  });
});
