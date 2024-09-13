import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { validateBody } from '../../../middlewares/validation';
import { conflict, forbidden, notFound, success } from '../../../utils/responses';
import { Error, Permission } from '../../../types';
import { fetchTournaments, updateTournament } from '../../../operations/tournament';
import { addCasterToTournament, removeAllCastersFromTournament } from '../../../operations/caster';

export default [
  // Middlewares
  ...hasPermission(Permission.anim),
  validateBody(
    Joi.object({
      name: Joi.string().optional(),
      maxPlayers: Joi.number().optional(),
      cashprize: Joi.number().optional(),
      cashprizeDetails: Joi.string().allow('').optional(),
      displayCashprize: Joi.boolean().optional(),
      format: Joi.string().allow('').optional(),
      infos: Joi.string().allow('').optional(),
      casters: Joi.array().items(Joi.string()).optional(),
      displayCasters: Joi.boolean().optional(),
      display: Joi.boolean().optional(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const allTournaments = await fetchTournaments();
      const tournament = allTournaments.find((t) => t.id === request.params.tournamentId);
      if (!tournament) {
        return notFound(response, Error.NotFound);
      }

      if (
        request.body.name &&
        allTournaments.some((t) => t.name === request.body.name && t.id !== request.params.tournamentId)
      ) {
        return conflict(response, Error.TournamentNameAlreadyExists);
      }

      if (request.body.casters && request.body.casters.length > 0) {
        await removeAllCastersFromTournament(request.params.tournamentId as string);

        for (const casterName of request.body.casters) {
          await addCasterToTournament(request.params.tournamentId as string, casterName);
        }
      }
      request.body.casters = undefined;

      if (
        request.body.maxPlayers !== undefined &&
        tournament.placesLeft < (tournament.maxPlayers - request.body.maxPlayers) / tournament.playersPerTeam
      ) {
        return forbidden(response, Error.TooMuchLockedTeams);
      }

      const result = await updateTournament(request.params.tournamentId as string, request.body);

      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
