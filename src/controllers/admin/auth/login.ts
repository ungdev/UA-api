import { NextFunction, Request, Response } from 'express';
import { login } from '../../../utils/login';

export default [
  // Middlewares

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    await login(request, response, next, true);
  },
];
