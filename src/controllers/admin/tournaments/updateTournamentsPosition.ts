import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { validateBody } from '../../../middlewares/validation';
import { notFound, success } from '../../../utils/responses';
import { Permission, Error } from '../../../types';
import { fetchTournaments, updateTournamentsPosition } from '../../../operations/tournament';

export default [
  // Middlewares
  ...hasPermission(Permission.anim),
  validateBody(
    Joi.object({
      tournaments: Joi.array()
        .items(
          Joi.object({
            id: Joi.string().required(),
            position: Joi.number().required(),
          }),
        )
        .required(),
    }).required(),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      // Check if all tournaments exist
      const tournaments = await fetchTournaments();

      for (const tournament of request.body.tournaments) {
        if (!tournaments.some((t) => t.id === tournament.id)) {
          return notFound(response, Error.NotFound);
        }
      }

      await updateTournamentsPosition(request.body.tournaments);

      const result = await fetchTournaments();

      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
