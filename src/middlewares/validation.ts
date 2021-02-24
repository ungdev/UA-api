import { Request, Response, NextFunction } from 'express';
import { ObjectSchema, Schema } from 'joi';
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

// Validate that a parameter is valid
// Must be used in a app.param and not app.use
export const validateParameter = (schema: Schema) => (
  request: Request,
  response: Response,
  next: NextFunction,
  parameter: string,
) => {
  const { error } = schema.validate(parameter);

  if (error) {
    logger.debug(error.message);
    return badRequest(response, Error.InvalidParameters);
  }

  return next();
};
