import { Request, Response } from 'express';
import { hash } from 'bcryptjs';
import { User } from '@prisma/client';
import { createUser } from '../../operations/user';
import { created } from '../../utils/responses';
import { isRegisterBodyValid, isUserUnique } from '../../middlewares/authentication';
import nanoid from '../../utils/nanoid';
import { arenaWebsite, bcryptLevel } from '../../utils/environment';

export default [
  // Middlewares
  isRegisterBodyValid(),
  isUserUnique(),
  // Controller
  async (request: Request, response: Response) => {
    const user = {
      id: nanoid(),
      username: request.body.username,
      firstname: request.body.firstname,
      lastname: request.body.lastname,
      email: request.body.email,
      password: await hash(request.body.password, bcryptLevel()),
      type: request.body.type,
      discordId: request.body.discordId,
      registerToken: nanoid(),
    } as User;

    await createUser(user);
    return created(response);
  },
];
