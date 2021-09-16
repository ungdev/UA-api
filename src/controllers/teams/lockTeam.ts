import { NextFunction, Request, Response } from 'express';
import { isCaptain, isTeamNotLocked } from '../../middlewares/team';
import { forbidden, gone, success } from '../../utils/responses';
import { lockTeam } from '../../operations/team';
import { fetchTournament } from '../../operations/tournament';
import { Error } from '../../types';
import { filterTeam } from '../../utils/filters';
import { getRequestInfo } from '../../utils/users';
import { syncRoles } from '../../../discordbot';

export default [
  // Middlewares
  ...isCaptain,
  isTeamNotLocked,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { team } = getRequestInfo(response);
      const tournament = await fetchTournament(team.tournamentId);

      // If there are more or equal teams than places, return a tournament full
      if (tournament.placesLeft === 0) {
        return gone(response, Error.TournamentFull);
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

      syncRoles();

      return success(response, filterTeam(lockedTeam));
    } catch (error) {
      return next(error);
    }
  },
];
