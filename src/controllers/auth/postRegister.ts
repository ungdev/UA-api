import { Request, Response } from 'express';
import { User } from '@prisma/client';
import { createUser } from '../../operations/user';
import { created } from '../../utils/responses';
import { isRegisterBodyValid, isUserUnique } from '../../middlewares/authentication';
import { createNewUserId } from '../../utils/user';

export default [
  // Middlewares
  isRegisterBodyValid(),
  isUserUnique(),
  // Controller
  async (request: Request, response: Response) => {
    const user = ({
      id: await createNewUserId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      username: request.body.username ? request.body.username : undefined,
      firstname: request.body.firstname,
      lastname: request.body.lastname,
      email: request.body.email,
      password: request.body.password,
      type: request.body.type,
    } as unknown) as User;

    await createUser(user);
    return created(response);
  },
];
