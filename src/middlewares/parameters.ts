import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { unauthenticated, unauthorized } from '../utils/responses';
import { getToken } from '../utils/user';
import { jwtSecret } from '../utils/environment';
import { Token, UserRequest } from '../types';

// export const isCaptainOfTeamId = (request: Request, response: Response, next: NextFunction): void => {
//   return next();
// };

export const isUserId = (request: UserRequest, response: Response, next: NextFunction): void => {
  const token = getToken(request);
  if (token) {
    const decoded = jwt.verify(token, jwtSecret()) as Token;
    if (decoded.userId.toString() === request.user.id) {
      return next();
    }
    return unauthorized(response);
  }
  return unauthenticated(response);
};

// export const isInTeamId = (request: Request, response: Response, next: NextFunction): void => {
//   return next();
// };
