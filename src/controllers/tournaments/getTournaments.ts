import { NextFunction, Request, Response } from 'express';
import { fetchTournaments } from '../../operations/tournament';
import { filterTournamentRestricted } from '../../utils/filters';
import { success } from '../../utils/responses';

export default [
  // Middlewares

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await fetchTournaments();
      return success(response, result.map(filterTournamentRestricted));
    } catch (error) {
      return next(error);
    }
  },
];
