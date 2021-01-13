import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { isNotInATeam } from '../../middlewares/team';
import validateBody from '../../middlewares/validateBody';
import { createTeam, fetchTeams } from '../../operations/team';
import { fetchTournament } from '../../operations/tournament';
import { Error } from '../../types';
import { badRequest, created, notFound } from '../../utils/responses';

export default [
  // Middlewares
  ...isNotInATeam,
  validateBody(
    Joi.object({
      name: Joi.string().required(),
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

      const teams = await fetchTeams(tournament.id);

      // Retreives the places of the tournament
      const places = tournament.maxPlayers / tournament.playersPerTeam;

      // If there are more or equal teams than places, returns a bad request
      if (teams.length >= places) {
        return badRequest(response, Error.TournamentNotFound);
      }

      try {
        const team = await createTeam(name, tournamentId, response.locals.user.id);
        return created(response, team);
      } catch (error) {
        // If the email already exists in the database, throw a bad request
        if (error.code === 'P2002' && error.meta && error.meta.target === 'name_tournamentId_unique')
          return badRequest(response, Error.TeamAlreadyExists);

        return next(error);
      }
    } catch (error) {
      return next(error);
    }
  },
];
