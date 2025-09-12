import { NextFunction, Request, Response } from 'express';
import { isAuthenticated } from '../../middlewares/authentication';
import { getRequestInfo } from '../../utils/users';
import { forcePay } from '../../operations/carts';
import { forbidden, noContent } from '../../utils/responses';
import { Error } from '../../types';
import { fetchTournament } from '../../operations/tournament';
import { fetchTeam } from '../../operations/team';

export default [
  // Middlewares
  ...isAuthenticated,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { user } = getRequestInfo(response);

      const team = await fetchTeam(user.teamId);

      if (!team) {
        return forbidden(response, Error.NotInTeam);
      }

      const tournament = await fetchTournament(team.tournamentId);

      if (!tournament?.ffsu) {
        return forbidden(response, Error.CartNotEligible);
      }

      await forcePay(user);

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
