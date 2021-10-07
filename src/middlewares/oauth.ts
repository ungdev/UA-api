import { NextFunction, Request, Response } from 'express';
import { Error } from '../types';
import { forbidden } from '../utils/responses';
import { getRequestInfo } from '../utils/users';

export const hasLinkedDiscordAccount = (request: Request, response: Response, next: NextFunction) => {
  const { user } = getRequestInfo(response);
  // The user exists
  if (!user?.discordId) return forbidden(response, Error.NoDiscordAccountLinked);
  return next();
};
