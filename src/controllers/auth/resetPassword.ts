import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { isValidToken } from '../../middlewares/parameters';
import validateBody from '../../middlewares/validateBody';
import { changePassword, fetchUser, removeUserResetToken } from '../../operations/user';
import { filterUser } from '../../utils/filters';
import { badRequest, success } from '../../utils/responses';
import { generateToken } from '../../utils/user';

export default [
  // Middlewares
  isNotAuthenticated(),
  isValidToken(),
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
        return badRequest(response);
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
