import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasPermission } from '../../../middlewares/authentication';
import { fetchUser } from '../../../operations/user';
import { fetchTeam } from '../../../operations/team';
import { validateQuery } from '../../../middlewares/validation';
import { forbidden, methodNotSupported, success } from '../../../utils/responses';
import { Permission, Error as ResponseError, UserSearchQuery, UserType } from '../../../types';
import { fetchRepoItem, removeRepoItem } from '../../../operations/repo';

export default [
  // Middlewares
  ...hasPermission(Permission.repo),
  validateQuery(
    Joi.object({
      userId: Joi.string().required(),
      itemId: Joi.string().required(),
    }).required(),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      let { userId, itemId } = request.query as UserSearchQuery & { id: string; itemId: string };

      const user = await fetchUser(userId);

      const team = await fetchTeam(user.teamId);
      if (!user.scannedAt || ((user.type === UserType.player || user.type === UserType.coach) && !team.lockedAt)) {
        return methodNotSupported(response, ResponseError.NotScannedOrLocked);
      }

      const item = await fetchRepoItem(itemId);
      if (item.forUserId !== userId) {
        return forbidden(response, ResponseError.NotYourItem);
      }
      await removeRepoItem(itemId, userId);
      return success(response, {});
    } catch (error) {
      return next(error);
    }
  },
];
