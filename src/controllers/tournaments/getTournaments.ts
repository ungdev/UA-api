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

      // if tournament visible is false, then filter it
      result.filter((tournament) => tournament.display);

      // if tournament casterVisible is false, then remove the caster
      for (const tournament of result) {
        if (!tournament.displayCasters) {
          tournament.casters = null;
        }

        if (!tournament.displayCashprize) {
          tournament.cashprize = null;
        }
      }

      return success(response, result.map(filterTournamentRestricted));
    } catch (error) {
      return next(error);
    }
  },
];
