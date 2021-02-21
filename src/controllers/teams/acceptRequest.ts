import { UserType } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { isCaptain, isTeamNotLocked } from '../../middlewares/team';
import { forbidden, success } from '../../utils/responses';
import { fetchTeam, joinTeam } from '../../operations/team';
import { filterTeam } from '../../utils/filters';
import { fetchUser } from '../../operations/user';
import { Error } from '../../types';
import { fetchTournament } from '../../operations/tournament';

export default [
  // Middlewares
  ...isCaptain,
  isTeamNotLocked,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { teamId, userId } = request.params;
      const user = await fetchUser(userId);
      const team = await fetchTeam(teamId);
      const tournament = await fetchTournament(team.tournamentId);

      if (!user.askingTeamId) return forbidden(response, Error.NotAskedATeam);

      // Checks if the team is full and the user is a player (a coach can join a full team)
      if (team.players.length >= tournament.playersPerTeam && user.type === UserType.player) {
        return forbidden(response, Error.TeamFull);
      }

      await joinTeam(teamId, user);

      const updatedTeam = await fetchTeam(teamId);

      return success(response, filterTeam(updatedTeam));
    } catch (error) {
      return next(error);
    }
  },
];
