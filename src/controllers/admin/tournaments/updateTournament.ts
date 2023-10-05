import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { TournamentId } from '@prisma/client';
import { hasPermission } from '../../../middlewares/authentication';
import { validateBody } from '../../../middlewares/validation';
import { notFound, success } from '../../../utils/responses';
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
      playersPerTeam: Joi.number().optional(),
      cashprize: Joi.number().optional(),
      cashprizeDetails: Joi.string().optional(),
      displayCashprize: Joi.boolean().optional(),
      format: Joi.string().optional(),
      infos: Joi.string().optional(),
      casters: Joi.array().items(Joi.string()).optional(),
      displayCasters: Joi.boolean().optional(),
      display: Joi.boolean().optional(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      if (
        !(await fetchTournaments()).some(
          (tournament) =>
            tournament.id === (request.params.tournamentId as (typeof TournamentId)[keyof typeof TournamentId]),
        )
      ) {
        return notFound(response, Error.NotFound);
      }

      if (request.body.casters && request.body.casters.length > 0) {
        await removeAllCastersFromTournament(
          request.params.tournamentId as (typeof TournamentId)[keyof typeof TournamentId],
        );

        for (const casterName of request.body.casters) {
          await addCasterToTournament(
            request.params.tournamentId as (typeof TournamentId)[keyof typeof TournamentId],
            casterName,
          );
        }
      }

      const result = await updateTournament(
        request.params.tournamentId as (typeof TournamentId)[keyof typeof TournamentId],
        request.body,
      );

      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
