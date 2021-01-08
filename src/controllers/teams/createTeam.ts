import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { isNotInATeam } from '../../middlewares/team';
import validateBody from '../../middlewares/validateBody';
import { fetchTeams } from '../../operations/team';
import { fetchTournament } from '../../operations/tournament';
import { Error } from '../../types';
import { badRequest, notFound, success } from '../../utils/responses';

export default [
  // Middlewares
  validateBody(
    Joi.object({
      name: Joi.string().required(),
      tournamentId: Joi.number().required(),
    }),
  ),

  isNotInATeam(),

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

      return success(response, teams);
    } catch (error) {
      return next(error);
    }
  },
];
