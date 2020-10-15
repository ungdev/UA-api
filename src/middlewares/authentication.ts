import { Response, NextFunction, Request } from 'express';
import jwt from 'jsonwebtoken';
import { getToken } from '../utils/user';
import { unauthorized, unauthenticated } from '../utils/responses';
import { Token, Permissions, UserRequest } from '../types';
import { jwtSecret } from '../utils/environment';

// Checks the user is authenticated. If not, it will return an error
export const isAuthenticated = () => (request: Request, response: Response, next: NextFunction) => {
  const token = getToken(request);
  if (token) {
    return next();
  }

  return unauthenticated(response);
};

// Checks the user has the given permission. If not, it will return an error
export const hasPermission = (permissions: Permissions) => (
  request: UserRequest,
  response: Response,
  next: NextFunction,
) => {
  const token = getToken(request);

  if (token) {
    const decoded = jwt.verify(token, jwtSecret()) as Token;

    request.user.permissions = decoded.permissions;

    if (decoded.permissions === permissions || decoded.permissions === Permissions.Admin) {
      return next();
    }
    return unauthorized(response);
  }

  return unauthenticated(response);
};
