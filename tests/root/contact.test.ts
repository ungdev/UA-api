import request from 'supertest';
import app from '../../src/app';
import { Error } from '../../src/types';
import { sandbox } from '../setup';
import * as slackService from '../../src/services/slack';

describe('POST /contact', () => {
  it('should send an internal server error', async () => {
    sandbox.stub(slackService, 'sendSlackContact').throws('Unexpected error');
    const body = {
      firstname: 'John',
      lastname: 'Doe',
      email: 'john.doe@test.com',
      subject: 'Test',
      message: 'Test test',
    };
    await request(app).post('/contact').send(body).expect(500, { error: Error.InternalServerError });
  });

  it('should send the message with a 204', async () => {
    sandbox.stub(slackService, 'sendSlackContact');

    const body = {
      firstname: 'John',
      lastname: 'Doe',
      email: 'john.doe@test.com',
      subject: 'Test',
      message: 'Test test',
    };
    await request(app).post('/contact').send(body).expect(204);
  });

  it('should not accept wrong email', async () => {
    const body = {
      firstname: 'John',
      lastname: 'Doe',
      email: 'wrong email',
      subject: 'Test',
      message: 'Test test',
    };
    await request(app).post('/contact').send(body).expect(400, { error: Error.InvalidBody });
  });

  it('should not accept missing parameters in body', async () => {
    const body = {
      subject: 'Test',
      message: 'Test test',
    };
    await request(app).post('/contact').send(body).expect(400, { error: Error.InvalidBody });
  });
});
