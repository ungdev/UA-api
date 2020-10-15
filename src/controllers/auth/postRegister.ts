import { Request, Response } from 'express';
import { User } from '@prisma/client';
import { createUser } from '../../operations/user';
import log from '../../utils/log';
import { created } from '../../utils/responses';
import { isUserUnique } from '../../middlewares/authentication';

function newUserId() {
  let number = Math.random() * 1000000;
  while (number < 100000) {
    number *= 10;
  }
  number = Math.floor(number);
  const id = number.toString();

  // Verify if the id isn't already taken
  // const sameId = await fetchUser(id);
  // if (sameId.length !== 0) {
  //   id = await newUserId();
  // }
  return id;
}

export default [
  // Middlewares
  isUserUnique(),
  // Controller
  async (request: Request, response: Response) => {
    const user = ({
      id: newUserId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      username: request.body.username,
      firstname: request.body.firstname,
      lastname: request.body.lastname,
      email: request.body.email,
      password: request.body.password,
      type: request.body.type,
    } as unknown) as User;

    log.debug(await createUser(user));
    return created(response);
  },
];
