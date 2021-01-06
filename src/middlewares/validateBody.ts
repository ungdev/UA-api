import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { Error } from '../types';
import log from '../utils/logger';
import { badRequest } from '../utils/responses';

export default (schema: ObjectSchema) => (request: Request, response: Response, next: NextFunction): void => {
  const { error, value } = schema.validate(request.body);

  if (error) {
    log.debug(error.message);
    return badRequest(response, Error.InvalidForm);
  }

  request.body = value;

  return next();
};
