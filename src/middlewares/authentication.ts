import { Response, NextFunction, Request } from 'express';
import jwt from 'jsonwebtoken';
import { getToken } from '../utils/user';
import { unauthorized, unauthenticated } from '../utils/responses';
import { Token, Permissions, PermissionsRequest } from '../types';
import { jwtSecret } from '../utils/environment';

// Checks the user is authenticated. If not, it will return an error
export const isAuthenticated = () => async (request: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = getToken(request);
  if (token) {
    return next();
  }

  return unauthenticated(res);
};

// Checks the user has the given permission. If not, it will return an error
export const hasPermission = (permissions: Permissions) => async (
  request: PermissionsRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = getToken(request);

  if (token) {
    const decoded = jwt.verify(token, jwtSecret()) as Token;

    request.permissions = decoded.permissions;

    if (decoded.permissions === permissions || decoded.permissions === Permissions.Admin) {
      return next();
    }
    return unauthorized(res);
  }

  return unauthenticated(res);
};
