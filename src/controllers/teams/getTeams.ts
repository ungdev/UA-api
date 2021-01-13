import { NextFunction, Request, Response } from 'express';
import { fetchTeams } from '../../operations/team';
import { success } from '../../utils/responses';

export default [
  // Middlewares

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      // const teams = await fetchTeams();
      return success(response, 'mange tes morts');
    } catch (error) {
      return next(error);
    }
  },
];
