import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { isNotInATeam } from '../../middlewares/team';
import validateBody from '../../middlewares/validateBody';
import { createTeam } from '../../operations/team';
import { fetchTournament } from '../../operations/tournament';
import { Error } from '../../types';
import { conflict, created, forbidden, notFound } from '../../utils/responses';
import * as validators from '../../utils/validators';

export default [
  // Middlewares
  ...isNotInATeam,
  validateBody(
    Joi.object({
      name: validators.teamName,
      tournamentId: Joi.string().required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { name, tournamentId } = request.body;

      const tournament = await fetchTournament(tournamentId);

      if (!tournament) {
        return notFound(response, Error.TournamentNotFound);
      }

      // If there are more or equal teams than places, return a tournament full
      if (tournament.placesLeft === 0) {
        return forbidden(response, Error.TournamentFull);
      }

      try {
        const team = await createTeam(name, tournamentId, response.locals.user.id);
        return created(response, team);
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
