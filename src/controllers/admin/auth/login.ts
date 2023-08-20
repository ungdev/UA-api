import { NextFunction, Request, Response } from 'express';
import { loginAccount } from '../../../utils/login';

export default [
  // Middlewares

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    await loginAccount(request, response, next, true);
  },
];
