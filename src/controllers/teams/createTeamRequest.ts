import { UserType } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasLinkedDiscordAccount } from '../../middlewares/oauth';
import { noSpectator } from '../../middlewares/team';
import { validateBody } from '../../middlewares/validation';
import { askJoinTeam, fetchTeam } from '../../operations/team';
import { Error } from '../../types';
import { filterUser } from '../../utils/filters';
import { forbidden, notFound, success } from '../../utils/responses';
import { getRequestInfo } from '../../utils/users';

export default [
  // Middlewares
  ...noSpectator,
  hasLinkedDiscordAccount,
  validateBody(
    Joi.object({
      userType: Joi.string().valid(UserType.player, UserType.coach).required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const team = await fetchTeam(request.params.teamId);

      // Check if the team exists
      if (!team) return notFound(response, Error.TeamNotFound);

      // Check if the team is not locked
      if (team.lockedAt) return forbidden(response, Error.TeamLocked);

      const { user } = getRequestInfo(response);

      // Check if the user is already asking for a team
      if (user.askingTeamId) return forbidden(response, Error.AlreadyAskedATeam);

      const updatedUser = await askJoinTeam(team.id, user.id, request.body.userType);

      return success(response, filterUser(updatedUser));
    } catch (error) {
      // This may happen when max coach amount is reached already
      if (error.code === 'API_MAX_COACH') return forbidden(response, Error.TeamMaxCoachReached);

      return next(error);
    }
  },
];
