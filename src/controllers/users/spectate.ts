import Joi from 'joi';
import type { Request, Response, NextFunction } from 'express';
import { isNotInATeam } from '../../middlewares/team';
import { validateBody } from '../../middlewares/validation';
import { getRequestInfo } from '../../utils/users';
import { forbidden, success } from '../../utils/responses';
import { Error } from '../../types';
import { updateAdminUser } from '../../operations/user';
import { UserType } from '.prisma/client';

export const become = [
  // Middlewares
  ...isNotInATeam,
  validateBody(Joi.object({})),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    const { user } = getRequestInfo(response);

    // If the user has a type, it means he is in a team or waiting to
    // be accepted in a team. He has to leave the team or cancel his
    // request before trying to become spactator.
    // IMPORTANT NOTE: becoming a {@link UserType#spectator} doesn't
    // ensure you to get a spectator ticket
    if (user.type) return forbidden(response, Error.CannotSpectate);

    try {
      const updatedUser = await updateAdminUser(user.id, {
        type: UserType.spectator,
      });
      return success(response, updatedUser);
    } catch (error) {
      return next(error);
    }
  },
];

export const leave = [
  // Middlewares
  ...isNotInATeam,
  validateBody(Joi.object({})),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    const { user } = getRequestInfo(response);

    // If the user has already paid, he can't discard his spectator ticket
    if (user.hasPaid) return forbidden(response, Error.AlreadyPaid);
    // The user is not a spectator: we send him an error
    if (user.type !== UserType.spectator) return forbidden(response, Error.CannotUnSpectate);

    try {
      const updatedUser = await updateAdminUser(user.id, {
        type: null,
      });
      return success(response, updatedUser);
    } catch (error) {
      return next(error);
    }
  },
];
