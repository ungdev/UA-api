import { Response, NextFunction, Request } from 'express';
import { getRequestInfo } from '../utils/users';
import { forbidden, unauthenticated } from '../utils/responses';
import { Error, Permission } from '../types';
import { isLoginAllowed } from './settings';
import { createLog } from '../operations/log';
import { deserializePermissions } from '../utils/helpers';

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
// Multiple permissions can be chained to allow mutliple permissions to access the ressource
export const hasPermission = (...permissions: Permission[]) => [
  ...isAuthenticated,
  (request: Request, response: Response, next: NextFunction) => {
    const { user } = getRequestInfo(response);

    if (!user.permissions) return forbidden(response, Error.NoPermission);

    const userPermissions = deserializePermissions(user.permissions);

    // If user is admin
    if (userPermissions.includes(Permission.admin)) {
      return next();
    }

    // If the user has the permission of one permission required
    for (const permission of permissions) {
      if (userPermissions.includes(permission)) return next();
    }

    return forbidden(response, Error.NoPermission);
  },
];
