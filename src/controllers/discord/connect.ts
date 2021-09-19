import type { Response, Request, NextFunction } from 'express';
import { isAuthenticated } from '../../middlewares/authentication';
import { success } from '../../utils/responses';
import { getRequestInfo } from '../../utils/users';
import { generateUserOAuthLink } from '../../services/discord';

export default [
  ...isAuthenticated,
  (request: Request, response: Response, next: NextFunction) => {
    try {
      const { user } = getRequestInfo(response);
      return success(response, {
        link: generateUserOAuthLink(user),
      });
    } catch {
      return next();
    }
  },
];
