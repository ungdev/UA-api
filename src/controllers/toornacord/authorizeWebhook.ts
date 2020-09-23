import { Request, Response } from 'express';
import { success } from '../../utils/responses';

export default [
  // Middlewares

  // Controller
  (request: Request, response: Response) => {
    const secret = request.headers['x-webhook-secret'];
    response.set('x-webhook-secret', secret);
    return success(response, secret);
  },
];
