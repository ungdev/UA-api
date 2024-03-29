import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasLinkedDiscordAccount } from '../../middlewares/oauth';
import { noSpectator } from '../../middlewares/team';
import { validateBody } from '../../middlewares/validation';
import { askJoinTeam, fetchTeam } from '../../operations/team';
import { hasUserAlreadyPaidForAnotherTicket } from '../../operations/user';
import { Error as ResponseError, UserType } from '../../types';
import { filterUser } from '../../utils/filters';
import { forbidden, notFound, success } from '../../utils/responses';
import { getRequestInfo } from '../../utils/users';

export default [
  // Middlewares
  ...noSpectator,
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
      const { user } = getRequestInfo(response);

      // Check if the team exists
      if (!team) return notFound(response, ResponseError.TeamNotFound);

      // Check if the team is not locked
      if (team.lockedAt && request.body.userType !== UserType.coach)
        return forbidden(response, ResponseError.TeamLocked);

      // Check if the user is already asking for a team
      if (user.askingTeamId) return forbidden(response, ResponseError.AlreadyAskedATeam);

      // Check whether the user has already paid for another ticket
      if (await hasUserAlreadyPaidForAnotherTicket(user, team.tournamentId, request.body.userType))
        return forbidden(response, ResponseError.HasAlreadyPaidForAnotherTicket);

      const updatedUser = await askJoinTeam(team.id, user.id, request.body.userType);

      return success(response, filterUser(updatedUser));
    } catch (error) {
      return next(error);
    }
  },
];
