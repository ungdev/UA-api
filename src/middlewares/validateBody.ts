import { Request, Response, NextFunction } from 'express';
import { validationResult, matchedData } from 'express-validator';
import { Error } from '../types';
import log from '../utils/log';
import { badRequest } from '../utils/responses';

export default () => (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    log.info(`Invalid form: ${JSON.stringify(errors)}`);
    return badRequest(res, Error.InvalidForm);
  }

  req.body = matchedData(req);

  return next();
};
