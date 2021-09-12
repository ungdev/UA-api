import Joi from 'joi';
import { NextFunction, Request, Response } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission, Error } from '../../../types';
import { forbidden, notFound, success } from '../../../utils/responses';
import { fetchUser } from '../../../operations/user';
import { validateBody } from '../../../middlewares/validation';
import * as validators from '../../../utils/validators';
import { fetchTeam, replaceUser } from '../../../operations/team';
import { filterUser } from '../../../utils/filters';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),
  validateBody(
    Joi.object({
      replacingUserId: validators.id,
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await fetchUser(request.params.userId);
      const targetUser = await fetchUser(request.body.replacingUserId);

      // Check if the user exists
      if (!user || !targetUser) {
        return notFound(response, Error.UserNotFound);
      }

      // Check if the user is in a team
      if (!user.teamId) {
        return forbidden(response, Error.NotInTeam);
      }

      // Check if the target user is not in a team
      if (targetUser.teamId) {
        return forbidden(response, Error.AlreadyInTeam);
      }

      const team = await fetchTeam(user.teamId);

      // Check if the team is locked
      if (!team.lockedAt) {
        return forbidden(response, Error.TeamNotLocked);
      }

      // Check if both user have the same type
      if (user.type !== targetUser.type) {
        return forbidden(response, Error.NotSameType);
      }

      // Check if the target user has paid
      if (!targetUser.hasPaid) {
        return forbidden(response, Error.NotPaid);
      }

      await replaceUser(user, targetUser, team);

      const updatedUser = await fetchUser(request.params.userId);
      const updatedTargetUser = await fetchUser(request.body.replacingUserId);

      return success(response, { replacedUser: filterUser(updatedUser), replacingUser: filterUser(updatedTargetUser) });
    } catch (error) {
      return next(error);
    }
  },
];
