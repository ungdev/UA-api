import { Response, NextFunction, Request } from 'express';
import { getToken, getUser } from '../utils/user';
import { unauthorized, unauthenticated } from '../utils/responses';
import { Permissions } from '../types';

// Checks the user is authenticated. If not, it will return an error
export const isAuthenticated = () => (request: Request, response: Response, next: NextFunction) => {
  const token = getToken(request);
  if (token) {
    return next();
  }

  return unauthenticated(response);
};

// Checks the user has the given permission. If not, it will return an error
export const hasPermission = (permissions: Permissions) => (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  const user = getUser(response);

  if (user) {
    if (user.permissions.search(permissions) || user.permissions.search(Permissions.admin)) {
      return next();
    }
    return unauthorized(response);
  }

  return unauthenticated(response);
};
