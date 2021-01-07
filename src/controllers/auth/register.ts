import { UserType } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import validateBody from '../../middlewares/validateBody';
import { createUser } from '../../operations/user';
import { created, noContent, success } from '../../utils/responses';
import { userValidator } from '../../validator';

export default [
  // Middlewares
  validateBody(
    Joi.object({
      username: Joi.string().required(),
      firstname: Joi.string().required(),
      lastname: Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().required(),
      discordId: Joi.string().required(),
      type: Joi.string().valid(UserType.player, UserType.coach, UserType.visitor),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { username, firstname, lastname, email, password, discordId } = request.body;

      await createUser(username, firstname, lastname, email, password, discordId);

      return created(response);
    } catch (error) {
      return next(error);
    }
  },
];
