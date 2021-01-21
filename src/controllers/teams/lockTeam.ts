import { NextFunction, Request, Response } from 'express';
import { isCaptain } from '../../middlewares/parameters';
import { forbidden, noContent, success } from '../../utils/responses';
import { fetchTeam, lockTeam } from '../../operations/team';
import { fetchTournament } from '../../operations/tournament';
import { Error } from '../../types';

export default [
  // Middlewares
  ...isCaptain,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const team = await fetchTeam(request.params.teamId);
      const tournament = await fetchTournament(team.tournamentId);

      // If there are more or equal teams than places, return a tournament full
      if (tournament.placesLeft === 0) {
        return forbidden(response, Error.TournamentFull);
      }

      if (team.lockedAt) {
        return forbidden(response, Error.TeamLocked);
      }

      // Checks if the team is full
      if (team.players.length < tournament.playersPerTeam) {
        return forbidden(response, Error.TeamNotFull);
      }

      // Checks if everyone has paid
      if (!team.players.every((player) => player.hasPaid)) {
        return forbidden(response, Error.TeamNotPaid);
      }

      const lockedTeam = await lockTeam(team.id);

      return success(response, lockedTeam);
    } catch (error) {
      return next(error);
    }
  },
];
