import request from 'supertest';
import { beforeEach } from 'mocha';
import { User, Error, Permission, Tournament } from '../../../src/types';
import database from '../../../src/services/database';
import * as mailOperations from '../../../src/services/email';
import { createFakeTeam, createFakeTournament, createFakeUser } from '../../utils';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';
import app from '../../../src/app';

describe('POST /admin/emails', () => {
  let tournament1: Tournament;
  let tournament2: Tournament;
  let nonAdminUser: User;
  let admin: User;
  let adminToken: string;

  before(async () => {
    admin = await createFakeUser({ permissions: [Permission.admin] });
    tournament1 = await createFakeTournament({ playersPerTeam: 2, maxTeams: 2 });
    tournament2 = await createFakeTournament({ playersPerTeam: 3, maxTeams: 1 });
    await createFakeTeam({ members: 1, tournament: tournament1.id });
    await createFakeTeam({ members: 3, tournament: tournament2.id });
    [nonAdminUser] = (await createFakeTeam({ members: 2, tournament: tournament1.id, locked: true })).players;
    adminToken = generateToken(admin);
  });

  beforeEach(() => {
    sandbox.stub(mailOperations, 'sendEmail');
  });

  after(async () => {
    await database.team.deleteMany();
    await database.orga.deleteMany();
    await database.user.deleteMany();
    await database.tournament.deleteMany();
  });

  it('should error as the user is not authenticated', () =>
    request(app).post(`/admin/emails`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(nonAdminUser);
    return request(app)
      .post(`/admin/emails`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should error as body is incomplete', () =>
    request(app)
      .post(`/admin/emails`)
      .send({
        subject: 'Test',
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400));

  describe('Test mail delivery errors', () => {
    it('should error as mail components are invalid', () =>
      request(app)
        .post(`/admin/emails`)
        .send({
          subject: 'Test',
          highlight: {
            intro: 'Is this a',
            title: 'Test ?',
          },
          content: [
            {
              title: 'Section',
              components: [
                {
                  isUnknownProperty: true,
                },
              ],
            },
          ],
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400, { error: Error.MalformedMailBody }));

    it('should error as mail sections are invalid', () =>
      request(app)
        .post(`/admin/emails`)
        .send({
          subject: 'Test',
          highlight: {
            intro: 'Is this a',
            title: 'Test ?',
          },
          content: [
            {
              title: 'Section',
              invalidSection: true,
            },
          ],
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400, { error: Error.MalformedMailBody }));

    it('should error if mails cannot be delivered (eg. network issue)', () => {
      sandbox.restore();
      sandbox.stub(mailOperations, 'sendEmail').throws('Oh no ! Another sneaky network issue 🤕');
      return request(app)
        .post(`/admin/emails`)
        .send({
          subject: 'Test',
          highlight: {
            intro: 'Is this a',
            title: 'Test ?',
          },
          content: [
            {
              title: 'Section',
              components: ['Empty (but valid) section'],
            },
          ],
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500, { error: Error.InternalServerError });
    });
  });

  describe('Test mail recipient filters', () => {
    const validMailBody = {
      subject: "Tomorrow's tournament cancelled due to extreme weather conditions",
      highlight: {
        intro: 'Is this a',
        title: 'Test ?',
      },
      content: [
        {
          title: 'Why did we choose to cancel the tournament ?',
          components: ["There was definitely no reason for that. We're just too lazy. _That's it_"],
        },
      ],
      reason: 'You should not have received this email as it has been generated for test purposes...',
    };

    it('should successfully send a valid preview mail to the sender (only)', () =>
      request(app)
        .post(`/admin/emails`)
        .send({
          ...validMailBody,
          preview: true,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201, { malformed: 0, delivered: 1, undelivered: 0 }));

    it('should successfully send a valid mail to everyone', () =>
      request(app)
        .post(`/admin/emails`)
        .send(validMailBody)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201, { malformed: 0, delivered: 7, undelivered: 0 }));

    it('should successfully send a valid mail to locked teams', () =>
      request(app)
        .post(`/admin/emails`)
        .send({
          locked: true,
          ...validMailBody,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201, { malformed: 0, delivered: 2, undelivered: 0 }));

    it('should successfully send a valid mail to a specific tournament', () =>
      request(app)
        .post(`/admin/emails`)
        .send({
          tournamentId: tournament1.id,
          ...validMailBody,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201, { malformed: 0, delivered: 3, undelivered: 0 }));

    it('should successfully send a valid mail to locked tournament teams', () =>
      request(app)
        .post(`/admin/emails`)
        .send({
          tournamentId: tournament1.id,
          locked: true,
          ...validMailBody,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201, { malformed: 0, delivered: 2, undelivered: 0 }));

    it('should successfully send a valid mail to unlocked tournament teams', () =>
      request(app)
        .post(`/admin/emails`)
        .send({
          tournamentId: tournament1.id,
          locked: false,
          ...validMailBody,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201, { malformed: 0, delivered: 1, undelivered: 0 }));

    it('should successfully send a valid mail to unlocked teams', () =>
      request(app)
        .post(`/admin/emails`)
        .send({
          locked: false,
          ...validMailBody,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201, { malformed: 0, delivered: 4, undelivered: 0 }));
  });
});
