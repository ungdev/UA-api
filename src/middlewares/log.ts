import { NextFunction, Request, Response } from 'express';
import { createLog } from '../operations/log';
import { getRequestInfo } from '../utils/users';

export const logSuccessfulUpdates = (request: Request, response: Response, next: NextFunction) => {
  // Logs the request if it makes modifications
  if (!response.locals.logging && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    // Prevent from generating logs twice
    response.locals.logging = true;

    // Wait the response to be ended
    response.on('finish', async () => {
      // Retreives the user
      const { user } = getRequestInfo(response);
      // The user must exists
      // and the response must be successful (is a 2xx response)
      if (user && Math.floor(response.statusCode / 100) === 2)
        await createLog(request.method, request.originalUrl, user.id, request.body);
    });
  }

  return next();
};
