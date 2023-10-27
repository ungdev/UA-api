import { NextFunction, Request, Response } from 'express';
import { isCaptain } from '../../middlewares/team';
import { forbidden, notFound, success } from '../../utils/responses';
import { fetchTeam, joinTeam } from '../../operations/team';
import { filterTeam } from '../../utils/filters';
import { fetchUser } from '../../operations/user';
import { Error, UserType } from '../../types';
import { fetchTournament } from '../../operations/tournament';
import { getRequestInfo } from '../../utils/users';

export default [
  // Middlewares
  ...isCaptain,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { userId } = request.params;
      const askingUser = await fetchUser(userId);

      // If the user does not exists
      if (!askingUser) return notFound(response, Error.UserNotFound);

      if (askingUser.teamId) return forbidden(response, Error.AlreadyInTeam);

      const { team } = getRequestInfo(response);
      const tournament = await fetchTournament(team.tournamentId);

      // If the user has not asked the team or a different team
      if (team.id !== askingUser.askingTeamId) return forbidden(response, Error.NotAskedTeam);

      // Checks if the team is full and the user is a player (a coach can join a full team)
      if (team.players.length >= tournament.playersPerTeam && askingUser.type === UserType.player) {
        return forbidden(response, Error.TeamFull);
      }

      if (team.coaches.length >= tournament.coachesPerTeam && askingUser.type === UserType.coach) {
        return forbidden(response, Error.TeamMaxCoachReached);
      }

      await joinTeam(team.id, askingUser, askingUser.type);

      const updatedTeam = await fetchTeam(team.id);

      return success(response, filterTeam(updatedTeam));
    } catch (error) {
      return next(error);
    }
  },
];
