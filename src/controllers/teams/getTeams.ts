import { TournamentId } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { validateQuery } from '../../middlewares/validation';
import { fetchTeams } from '../../operations/team';
import { fetchTournament } from '../../operations/tournament';
import { Error } from '../../types';
import { filterTeam } from '../../utils/filters';
import { notFound, success } from '../../utils/responses';

export default [
  // Middlewares
  validateQuery(
    Joi.object({
      locked: Joi.string().valid('true', 'false').optional(),
      tournamentId: Joi.string().required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { tournamentId, locked } = request.query as { tournamentId: TournamentId; locked: string };
      const lockedCasted = Boolean(locked);

      const tournament = await fetchTournament(tournamentId);

      if (!tournament) {
        return notFound(response, Error.TournamentNotFound);
      }

      const teams = await fetchTeams(tournamentId);

      // Filter the team by if the lock filter is enabled and/or the team is locked
      const result = teams
        .filter((team) => {
          if (!lockedCasted) {
            return true;
          }

          return !!team.lockedAt;
        })
        .map(filterTeam);

      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
