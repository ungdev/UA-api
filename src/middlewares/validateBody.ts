import { Request, Response, NextFunction } from 'express';
import { validationResult, matchedData } from 'express-validator';
import { Error } from '../types';
import log from '../utils/log';
import { badRequest } from '../utils/responses';

export default () => (request: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(request);

  if (!errors.isEmpty()) {
    log.info(`Invalid form: ${JSON.stringify(errors)}`);
    return badRequest(res, Error.InvalidForm);
  }

  request.body = matchedData(request);

  return next();
};
