import { NextFunction, Request, Response } from 'express';
import { fetchTournaments } from '../../operations/tournament';
import { success } from '../../utils/responses';

export default [
  // Middlewares

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await fetchTournaments();
      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
