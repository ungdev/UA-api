import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { Error } from '../types';
import logger from '../utils/logger';
import { badRequest } from '../utils/responses';

export const validateBody = (schema: ObjectSchema) => (request: Request, response: Response, next: NextFunction) => {
  const { error, value } = schema.validate(request.body);

  if (error) {
    logger.debug(error.message);
    return response.status(400).json({ error: error.message });
  }

  request.body = value;

  return next();
};

export const validateQuery =
  (schema: ObjectSchema) =>
  (request: Request, response: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(request.query);

    if (error) {
      logger.verbose(error.message);
      return badRequest(response, Error.InvalidQueryParameters);
    }

    request.query = value;

    return next();
  };

export const enforceQueryString = (request: Request, response: Response, next: NextFunction) => {
  for (const parameter of Object.keys(request.query)) {
    if (Array.isArray(request.query[parameter]) || request.query[parameter] instanceof Object) {
      return badRequest(response, Error.InvalidQueryParameters);
    }
  }

  return next();
};
