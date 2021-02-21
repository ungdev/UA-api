import { Response, NextFunction, Request } from 'express';
import { getRequestInfo } from '../utils/user';
import { forbidden, unauthenticated } from '../utils/responses';
import { Error, Permission } from '../types';
import { isLoginAllowed } from './settings';
import { createLog } from '../operations/log';

// Checks the user is authenticated. If not, it will return an error
export const isAuthenticated = [
  isLoginAllowed,
  (request: Request, response: Response, next: NextFunction) => {
    // Retreives the user
    const { user } = getRequestInfo(response);

    // The user must exists
    if (!user) {
      return unauthenticated(response);
    }

    // Logs the request if it makes modifications and if was successful

    // Check if the request has the goal to make modifications
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      // Wait the response to be ended
      response.on('finish', async () => {
        // Checks if the response was successful (is a 2xx response)
        if (Math.floor(response.statusCode / 100) === 2) {
          await createLog(request.method, request.originalUrl, user.id, request.body);
        }
      });
    }

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
export const hasPermission = (permission: Permission) => [
  ...isAuthenticated,
  (request: Request, response: Response, next: NextFunction) => {
    const { user } = getRequestInfo(response);

    if (!user.permissions) return forbidden(response, Error.NoPermission);

    // If user has required permission or has "admin" permission
    if (user.permissions.split(',').includes(permission) || user.permissions.split(',').includes(Permission.admin)) {
      return next();
    }

    return forbidden(response, Error.NoPermission);
  },
];
