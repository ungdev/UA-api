import { UserType } from '@prisma/client';
import { Response, NextFunction, Request } from 'express';
import { getRequestUser } from '../utils/user';
import { forbidden, unauthenticated, conflict } from '../utils/responses';
import { Error, Permission } from '../types';
import { isLoginAllowed } from './settings';

// Checks the user is authenticated. If not, it will return an error
export const isAuthenticated = [
  isLoginAllowed,
  (request: Request, response: Response, next: NextFunction) => {
    // Retreives the user
    const user = getRequestUser(response);

    // The user must exists
    if (!user) {
      return unauthenticated(response);
    }

    // It mustn't be a visitor
    if (user.type === UserType.visitor) {
      return forbidden(response, Error.LoginAsVisitor);
    }

    // It must be activated
    if (user.registerToken) {
      return forbidden(response, Error.EmailNotConfirmed);
    }

    // NB, those conditions should never happen as there are in the login session, but could happend if a user is changed in the database
    return next();
  },
];

export const isNotAuthenticated = [
  isLoginAllowed,
  (request: Request, response: Response, next: NextFunction) => {
    // If there is a user in the locals
    if (!getRequestUser(response)) {
      return next();
    }

    return forbidden(response, Error.AlreadyAuthenticated);
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
