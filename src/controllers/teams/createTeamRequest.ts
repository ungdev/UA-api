import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasLinkedDiscordAccount } from '../../middlewares/oauth';
import { isNotInATeam } from '../../middlewares/team';
import { validateBody } from '../../middlewares/validation';
import { askJoinTeam, fetchTeam } from '../../operations/team';
import { Error as ResponseError, UserType } from '../../types';
import { filterUser } from '../../utils/filters';
import { forbidden, notFound, success } from '../../utils/responses';
import { getRequestInfo } from '../../utils/users';

export default [
  // Middlewares
  ...isNotInATeam,
  hasLinkedDiscordAccount,
  validateBody(
    Joi.object({
      userType: Joi.string()
        .valid(UserType.player, UserType.coach)
        .required()
        .error(new Error(ResponseError.NotplayerOrCoach)),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const team = await fetchTeam(request.params.teamId);

      // Check if the team exists
      if (!team) return notFound(response, ResponseError.TeamNotFound);

      // Check if the team is not locked
      if (team.lockedAt) return forbidden(response, ResponseError.TeamLocked);

      const { user } = getRequestInfo(response);

      // Check if the user is already asking for a team
      if (user.askingTeamId) return forbidden(response, ResponseError.AlreadyAskedATeam);

      const updatedUser = await askJoinTeam(team.id, user.id, request.body.userType);

      return success(response, filterUser(updatedUser));
    } catch (error) {
      // This may happen when max coach amount is reached already
      if (error.code === 'API_COACH_MAX_TEAM') return forbidden(response, ResponseError.TeamMaxCoachReached);

      return next(error);
    }
  },
];
