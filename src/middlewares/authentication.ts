import { Response, NextFunction, Request } from 'express';
import { getRequestUser } from '../utils/user';
import { unauthorized, unauthenticated, badRequest } from '../utils/responses';
import { Permission } from '../types';

// Checks the user is authenticated. If not, it will return an error
export const isAuthenticated = () => (request: Request, response: Response, next: NextFunction) => {
  // If there is a user in the locals
  if (getRequestUser(response)) {
    return next();
  }

  return unauthenticated(response);
};

export const isNotAuthenticated = () => (request: Request, response: Response, next: NextFunction) => {
  // If there is a user in the locals
  if (!getRequestUser(response)) {
    return next();
  }

  return badRequest(response);
};

// Checks the user has the given permission. If not, it will return an error
export const hasPermission = (permission: Permission) => (request: Request, response: Response, next: NextFunction) => {
  const user = getRequestUser(response);

  if (user) {
    // If user has required permission or has "admin" permission
    if (user.permissions.split(',').includes(permission) || user.permissions.split(',').includes(Permission.admin)) {
      return next();
    }

    return unauthorized(response);
  }

  return unauthenticated(response);
};
