import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { Error } from '../types';
import logger from '../utils/logger';
import { badRequest } from '../utils/responses';

export default (schema: ObjectSchema) => (request: Request, response: Response, next: NextFunction): void => {
  const { error, value } = schema.validate(request.body);

  if (error) {
    logger.debug(error.message);
    console.log('fdsfdsfs');
    return badRequest(response, Error.InvalidBody);
  }

  request.body = value;

  return next();
};
