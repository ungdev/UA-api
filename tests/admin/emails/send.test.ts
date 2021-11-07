import request from 'supertest';
import { beforeEach } from 'mocha';
import { User, Error, Permission, TournamentId, UserType } from '../../../src/types';
import database from '../../../src/services/database';
import * as mailOperations from '../../../src/services/email';
import { createFakeTeam, createFakeUser } from '../../utils';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';
import app from '../../../src/app';

describe('POST /admin/emails', () => {
  let nonAdminUser: User;
  let admin: User;
  let adminToken: string;

  before(async () => {
    admin = await createFakeUser({ type: UserType.orga, permissions: [Permission.admin] });
    await createFakeTeam({ members: 4, tournament: TournamentId.csgo });
    await createFakeTeam({ members: 2, tournament: TournamentId.lolLeisure });
    [nonAdminUser] = (await createFakeTeam({ members: 5, tournament: TournamentId.csgo, locked: true })).players;
    adminToken = generateToken(admin);
  });

  beforeEach(() => {
    sandbox.stub(mailOperations, 'sendEmail');
  });

  after(async () => {
    await database.team.deleteMany();
    await database.user.deleteMany();
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
        .expect(201, { malformed: 0, delivered: 12, undelivered: 0 }));

    it('should successfully send a valid mail to locked teams', () =>
      request(app)
        .post(`/admin/emails`)
        .send({
          locked: true,
          ...validMailBody,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201, { malformed: 0, delivered: 5, undelivered: 0 }));

    it('should successfully send a valid mail to a specific tournament', () =>
      request(app)
        .post(`/admin/emails`)
        .send({
          tournamentId: TournamentId.csgo,
          ...validMailBody,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201, { malformed: 0, delivered: 9, undelivered: 0 }));

    it('should successfully send a valid mail to locked tournament teams', () =>
      request(app)
        .post(`/admin/emails`)
        .send({
          tournamentId: TournamentId.csgo,
          locked: true,
          ...validMailBody,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201, { malformed: 0, delivered: 5, undelivered: 0 }));

    it('should successfully send a valid mail to unlocked tournament teams', () =>
      request(app)
        .post(`/admin/emails`)
        .send({
          tournamentId: TournamentId.csgo,
          locked: false,
          ...validMailBody,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201, { malformed: 0, delivered: 4, undelivered: 0 }));

    it('should successfully send a valid mail to unlocked teams', () =>
      request(app)
        .post(`/admin/emails`)
        .send({
          locked: false,
          ...validMailBody,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201, { malformed: 0, delivered: 6, undelivered: 0 }));
  });
});
