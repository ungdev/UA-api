import { Response, NextFunction, Request } from 'express';
import jwt from 'jsonwebtoken';
import { getToken } from '../utils/jwt';
import { unauthorized, unauthenticated } from '../utils/responses';
import { Token, Permissions, PermissionsRequest } from '../types';
import { jwtSecret } from '../utils/env';

// Checks the user is authenticated. If not, it will return an error
export const isAuthenticated = () => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = getToken(req);
  if (token) {
    return next();
  }

  return unauthenticated(res);
};

// Checks the user has the given permission. If not, it will return an error
export const hasPermission = (permissions: Permissions) => async (
  req: PermissionsRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = getToken(req);

  if (token) {
    const decoded = jwt.verify(token, jwtSecret()) as Token;

    req.permissions = decoded.permissions;

    if (decoded.permissions === permissions || decoded.permissions === Permissions.Admin) {
      return next();
    }
    return unauthorized(res);
  }

  return unauthenticated(res);
};
