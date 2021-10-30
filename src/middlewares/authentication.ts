import { Response, NextFunction, Request } from 'express';
import { getRequestInfo } from '../utils/users';
import { forbidden, unauthenticated } from '../utils/responses';
import { Error, Permission } from '../types';
import { isLoginAllowed } from './settings';
import { logSuccessfulUpdates } from './log';

// Checks the user is authenticated. If not, it will return an error
export const isAuthenticated = [
  isLoginAllowed,
  logSuccessfulUpdates,
  (request: Request, response: Response, next: NextFunction) => {
    // Retreives the user
    const { user } = getRequestInfo(response);

    // The user must exists
    if (!user) return unauthenticated(response);

    return next();
  },
];

export const isNotAuthenticated = [
  isLoginAllowed,
  (request: Request, response: Response, next: NextFunction) => {
    const { user } = getRequestInfo(response);

    // If there is a user in the locals
    if (!user) {
      return next();
    }

    return forbidden(response, Error.AlreadyAuthenticated);
  },
];

// Checks the user has the given permission. If not, it will return an error
// Multiple permissions can be chained to allow mutliple permissions to access the ressource
export const hasPermission = (...permissions: Permission[]) => [
  ...isAuthenticated,
  (request: Request, response: Response, next: NextFunction) => {
    const { user } = getRequestInfo(response);

    if (!user.permissions) return forbidden(response, Error.NoPermission);

    // If user is admin
    if (user.permissions.includes(Permission.admin)) {
      return next();
    }

    // If the user has the permission of one permission required
    for (const permission of permissions) {
      if (user.permissions.includes(permission)) return next();
    }

    return forbidden(response, Error.NoPermission);
  },
];
