import { Request, Response, NextFunction, json } from 'express';
import { Error } from '../types';
import { unsupportedMediaType } from '../utils/responses';

/**
 * Checks if the header content-type is added on POST/PUT/PATCH/DELETE methods.
 * Limit the content type header to application/json or application/json;charset=UTF-8
 or nothing.
 * This middleware is used to reduce the attack surface
 */
export default [
  (request: Request, response: Response, next: NextFunction) => {
    const bodyMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    const contentType = request.get('Content-Type');

    // Continues if the method can't contain a body, or that the content type is not precised or that is precised to be json
    if (
      !bodyMethods.includes(request.method) ||
      !contentType ||
      contentType === 'application/json' ||
      contentType.includes('multipart/form-data') ||
      contentType.toLowerCase() === 'application/json;charset=utf-8'
    ) {
      return next();
    }
    
    return unsupportedMediaType(response, Error.UnsupportedMediaType);
  },

  json(),
];
