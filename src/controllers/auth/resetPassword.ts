import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { isNotAuthenticated } from '../../middlewares/authentication';
import validateBody from '../../middlewares/validateBody';
import { changePassword, fetchUser, removeUserResetToken } from '../../operations/user';
import { Error } from '../../types';
import { filterUser } from '../../utils/filters';
import { badRequest, success } from '../../utils/responses';
import { generateToken } from '../../utils/user';

export default [
  // Middlewares
  ...isNotAuthenticated,
  validateBody(
    Joi.object({
      password: Joi.string().required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { token } = request.params;
      const { password } = request.body;

      const user = await fetchUser(token, 'resetToken');

      if (!user) {
        return badRequest(response, Error.InvalidParameters);
      }

      await removeUserResetToken(user);
      await changePassword(user, password);

      const jwt = generateToken(user);

      return success(response, {
        token: jwt,
        user: filterUser(user),
      });
    } catch (error) {
      return next(error);
    }
  },
];
