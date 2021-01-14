import { Response, NextFunction, Request } from 'express';
import { getRequestUser } from '../utils/user';
import { forbidden, unauthenticated, conflict } from '../utils/responses';
import { Error, Permission } from '../types';
import { isLoginAllowed } from './settings';

// Checks the user is authenticated. If not, it will return an error
export const isAuthenticated = [
  isLoginAllowed,
  (request: Request, response: Response, next: NextFunction) => {
    // If there is a user in the locals
    if (getRequestUser(response)) {
      return next();
    }

    return unauthenticated(response);
  },
];

export const isNotAuthenticated = [
  isLoginAllowed,
  (request: Request, response: Response, next: NextFunction) => {
    // If there is a user in the locals
    if (!getRequestUser(response)) {
      return next();
    }

    return conflict(response, Error.AlreadyAuthenticated);
  },
];

// Checks the user has the given permission. If not, it will return an error
export const hasPermission = [
  isAuthenticated,
  (permission: Permission) => (request: Request, response: Response, next: NextFunction) => {
    const user = getRequestUser(response);

    // If user has required permission or has "admin" permission
    if (user.permissions.split(',').includes(permission) || user.permissions.split(',').includes(Permission.admin)) {
      return next();
    }

    return forbidden(response, Error.NoPermission);
  },
];
