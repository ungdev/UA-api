import { Response, NextFunction, Request } from 'express';
import { getToken } from '../utils/user';
import { unauthorized, unauthenticated } from '../utils/responses';
import { Permissions, UserRequest } from '../types';

// Checks the user is authenticated. If not, it will return an error
export const isAuthenticated = () => async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  const token = getToken(request);
  if (token) {
    return next();
  }

  return unauthenticated(response);
};

// Checks the user has the given permission. If not, it will return an error
export const hasPermission = (permissions: Permissions) => async (
  request: UserRequest,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  const { user } = request;

  if (user) {
    if (user.permissions === permissions || user.permissions === Permissions.Admin) {
      return next();
    }
    return unauthorized(response);
  }

  return unauthenticated(response);
};
