import { Response, NextFunction, Request } from 'express';
import { getToken, getRequestUser } from '../utils/user';
import { unauthorized, unauthenticated } from '../utils/responses';
import { Permission } from '../types';

// Checks the user is authenticated. If not, it will return an error
export const isAuthenticated = () => (request: Request, response: Response, next: NextFunction) => {
  const token = getToken(request);
  if (token) {
    return next();
  }

  return unauthenticated(response);
};

// Checks the user has the given permission. If not, it will return an error
export const hasPermission = (permission: Permission) => (request: Request, response: Response, next: NextFunction) => {
  const user = getRequestUser(response);

  const containsPermission = (userPermissions: string, permission: Permission) => {
    return (
      // User has only this permission
      userPermissions === permission ||
      // Contains this permission (but it is not the last of the list)
      userPermissions.includes(`${permission},`) ||
      // Contains this permission (and it is the last of the list)
      userPermissions.endsWith(`,${permission}`)
    );
  };

  if (user) {
    // If user has required permission or has "admin" permission
    if (containsPermission(user.permissions, permission) || containsPermission(user.permissions, Permission.admin)) {
      return next();
    }
    return unauthorized(response);
  }

  return unauthenticated(response);
};
