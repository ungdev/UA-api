import { NextFunction, Request, Response } from 'express';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { isValidToken } from '../../middlewares/parameters';
import { fetchUser, removeUserRegisterToken } from '../../operations/user';
import { filterUser } from '../../utils/filters';
import { badRequest, success } from '../../utils/responses';
import { generateToken } from '../../utils/user';

export default [
  // Middlewares
  isNotAuthenticated(),
  isValidToken(),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { token } = request.params;

      const user = await fetchUser(token, 'registerToken');

      if (!user) {
        return badRequest(response);
      }

      await removeUserRegisterToken(user);

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
