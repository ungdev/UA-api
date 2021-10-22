import request from 'supertest';
import { UserType } from '.prisma/client';
import { User, Error, Permission } from '../../../src/types';
import database from '../../../src/services/database';
import * as mailOperations from '../../../src/services/email';
import { createFakeUser } from '../../utils';
import { sandbox } from '../../setup';
import { generateToken } from '../../../src/utils/users';
import app from '../../../src/app';

describe('GET /admin/emails', () => {
  let nonAdminUser: User;
  let admin: User;
  let adminToken: string;

  before(async () => {
    admin = await createFakeUser({ type: UserType.orga, permission: Permission.admin });
    nonAdminUser = await createFakeUser();
    adminToken = generateToken(admin);
  });

  after(() => database.user.deleteMany());

  it('should error as the user is not authenticated', () =>
    request(app).get(`/admin/emails`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(nonAdminUser);
    return request(app)
      .get(`/admin/emails`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should return a 500 error code', () => {
    sandbox.stub(database.log, 'findMany').throws('This method is temporarily broken');
    return request(app)
      .get(`/admin/emails`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should fetch one mail', async () => {
    const mailContent = {
      subject: 'Very important news&nbsp;!',
      content: [
        {
          title: 'Save the date&nbsp;!',
          components: ['UA 20XX will be on *XX/XX/20XX*'],
        },
      ],
    };
    sandbox.stub(mailOperations, 'sendEmail');
    await request(app)
      .post('/admin/emails')
      .send(mailContent)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201, {
        malformed: 0,
        delivered: 2,
        undelivered: 0,
      });
    await new Promise<void>((result) => setTimeout(result, 1e2));
    const [log] = await database.log.findMany({
      where: {
        method: 'POST',
        userId: admin.id,
        path: `/admin/emails`,
      },
    });
    return request(app)
      .get(`/admin/emails`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, [
        {
          ...mailContent,
          sender: {
            id: admin.id,
            username: admin.username,
            type: admin.type,
            firstname: admin.firstname,
            lastname: admin.lastname,
            email: admin.email,
            permissions: admin.permissions,
          },
          sentAt: log.createdAt.toISOString(),
          preview: false,
        },
      ]);
  });

  it('should fetch one preview mail', async () => {
    await database.log.deleteMany();
    const mailContent = {
      subject: 'Very important news&nbsp;!',
      content: [
        {
          title: 'Save the date&nbsp;!',
          components: ['UA 20XX will be on *XX/XX/20XX*'],
        },
      ],
    };
    sandbox.stub(mailOperations, 'sendEmail');
    await request(app)
      .post('/admin/emails')
      .send({ preview: true, ...mailContent })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201, {
        malformed: 0,
        delivered: 1,
        undelivered: 0,
      });
    await new Promise<void>((result) => setTimeout(result, 1e2));
    const [log] = await database.log.findMany({
      where: {
        method: 'POST',
        userId: admin.id,
        path: `/admin/emails`,
      },
    });
    return request(app)
      .get(`/admin/emails`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200, [
        {
          ...mailContent,
          sender: {
            id: admin.id,
            username: admin.username,
            type: admin.type,
            firstname: admin.firstname,
            lastname: admin.lastname,
            email: admin.email,
            permissions: admin.permissions,
          },
          sentAt: log.createdAt.toISOString(),
          preview: true,
        },
      ]);
  });
});
