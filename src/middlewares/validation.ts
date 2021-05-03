import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { Error } from '../types';
import logger from '../utils/logger';
import { badRequest } from '../utils/responses';

export const validateBody = (schema: ObjectSchema) => (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const { error, value } = schema.validate(request.body);

  if (error) {
    logger.debug(error.message);
    return badRequest(response, Error.InvalidBody);
  }

  request.body = value;

  return next();
};

export const validateQuery = (schema: ObjectSchema) => (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const { error, value } = schema.validate(request.query);

  if (error) {
    logger.debug(error.message);
    return badRequest(response, Error.InvalidQueryParameters);
  }

  request.query = value;

  return next();
};
