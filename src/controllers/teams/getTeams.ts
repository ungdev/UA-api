import { TournamentId } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { validateQuery } from '../../middlewares/validation';
import { fetchTeams } from '../../operations/team';
import { filterTeamPublic } from '../../utils/filters';
import { success } from '../../utils/responses';
import * as validators from '../../utils/validators';

export default [
  // Middlewares
  validateQuery(
    Joi.object({
      locked: Joi.string().valid('true', 'false').optional(),
      tournamentId: validators.tournamentId.required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { tournamentId, locked } = request.query as { tournamentId: TournamentId; locked: string };
      const lockedCasted = Boolean(locked);

      const teams = await fetchTeams(tournamentId);

      // Filter the team by if the lock filter is enabled and/or the team is locked
      const result = teams
        .filter((team) => {
          if (!lockedCasted) {
            return true;
          }

          return !!team.lockedAt;
        })
        .map(filterTeamPublic);

      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
