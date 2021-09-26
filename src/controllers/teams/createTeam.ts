import { UserType } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasLinkedDiscordAccount } from '../../middlewares/oauth';
import { noSpectator } from '../../middlewares/team';
import { validateBody } from '../../middlewares/validation';
import { createTeam } from '../../operations/team';
import { fetchTournament } from '../../operations/tournament';
import { Error } from '../../types';
import { filterTeam } from '../../utils/filters';
import { conflict, created, gone } from '../../utils/responses';
import * as validators from '../../utils/validators';

export default [
  // Middlewares
  ...noSpectator,
  hasLinkedDiscordAccount,
  validateBody(
    Joi.object({
      name: validators.teamName.required(),
      tournamentId: validators.tournamentId.required(),
      userType: Joi.string().valid(UserType.player, UserType.coach).required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { name, tournamentId, userType } = request.body;

      const tournament = await fetchTournament(tournamentId);

      // If there are more or equal teams than places, return a tournament full
      if (tournament.placesLeft === 0) {
        return gone(response, Error.TournamentFull);
      }

      try {
        const team = await createTeam(name, tournamentId, response.locals.user.id, userType);
        return created(response, filterTeam(team));
      } catch (error) {
        // If the email already exists in the database, throw a bad request
        if (error.code === 'P2002' && error.meta && error.meta.target === 'name_tournamentId_unique')
          return conflict(response, Error.TeamAlreadyExists);

        return next(error);
      }
    } catch (error) {
      return next(error);
    }
  },
];
