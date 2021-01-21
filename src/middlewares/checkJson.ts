import { ErrorRequestHandler, Request, Response, NextFunction, json } from 'express';
import { Error } from '../types';
import { badRequest, unsupportedMediaType } from '../utils/responses';

/**
 * Checks if the header content-type is added on POST/PUT/PATCH/DELETE methods.
 * Limit the content type header to application/json or nothing.
 * This middleware is used to reduce the attack surface
 */
export default [
  (request: Request, response: Response, next: NextFunction) => {
    const noBodyMethods = ['HEAD', 'GET'];
    const contentType = request.get('Content-Type');

    // Checks if the method doesn't allow body or the body is empty
    if (noBodyMethods.includes(request.method) || !contentType || contentType === 'application/json') {
      return next();
    }

    return unsupportedMediaType(response, Error.UnsupportedMediaType);
  },

  json(),

  (error: ErrorRequestHandler, request: Request, response: Response, next: NextFunction) => {
    if (error instanceof SyntaxError) {
      return badRequest(response, Error.MalformedBody);
    }

    return next();
  },
];
