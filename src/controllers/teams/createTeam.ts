import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasLinkedDiscordAccount } from '../../middlewares/oauth';
import { noSpectator } from '../../middlewares/team';
import { validateBody } from '../../middlewares/validation';
import whitelist from '../../middlewares/whitelist';
import { createTeam } from '../../operations/team';
import { fetchTournament } from '../../operations/tournament';
import { hasUserAlreadyPaidForAnotherTicket } from '../../operations/user';
import { Error as ResponseError, UserType } from '../../types';
import { filterTeam } from '../../utils/filters';
import { badRequest, conflict, created, forbidden, gone, notFound } from '../../utils/responses';
import { getRequestInfo } from '../../utils/users';
import * as validators from '../../utils/validators';

export default [
  // Middlewares
  ...noSpectator,
  ...whitelist,
  hasLinkedDiscordAccount,
  validateBody(
    Joi.object({
      name: validators.teamName.required(),
      tournamentId: Joi.string().required(),
      pokemonPlayerId: Joi.string().pattern(/^\d+$/),
      userType: Joi.string()
        .valid(UserType.player, UserType.coach)
        .required()
        .error(new Error(ResponseError.InvalidUserType)),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { name, tournamentId, pokemonPlayerId, userType } = request.body;
      const { user } = getRequestInfo(response);

      const tournament = await fetchTournament(tournamentId);

      if (!tournament) {
        return notFound(response, ResponseError.TournamentNotFound);
      }

      // If there are more or equal teams than places, return a tournament full
      if (tournament.placesLeft === 0) {
        return gone(response, ResponseError.TournamentFull);
      }

      // Check whether the user has already paid for another ticket
      if (await hasUserAlreadyPaidForAnotherTicket(user, tournamentId, userType))
        return forbidden(response, ResponseError.HasAlreadyPaidForAnotherTicket);

      if (tournamentId === 'pokemon' && !pokemonPlayerId) {
        return badRequest(response, ResponseError.NoPokemonIdProvided);
      }

      try {
        const team = await createTeam(name, tournamentId, response.locals.user.id, pokemonPlayerId, userType);
        return created(response, filterTeam(team));
      } catch (error) {
        // If the email already exists in the database, throw a bad request
        if (error.code === 'P2002' && error.meta && error.meta.target === 'teams_name_tournamentId_key')
          return conflict(response, ResponseError.TeamAlreadyExists);

        return next(error);
      }
    } catch (error) {
      return next(error);
    }
  },
];
