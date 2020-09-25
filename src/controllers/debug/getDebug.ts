import { Request, Response } from 'express';
import log from '../../utils/log';
import { isUserId } from '../../middlewares/parameters';

export default [
  // Midllewares
  isUserId,
  // Controller
  (request: Request, response: Response) => {
    log.debug('aaa');
    return response.send(request.query.hey);
  },
];
