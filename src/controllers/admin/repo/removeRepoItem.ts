import { NextFunction, Request, Response } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { fetchUser } from '../../../operations/user';
import { fetchTeam } from '../../../operations/team';
import { forbidden, methodNotSupported, notFound, success } from '../../../utils/responses';
import { Permission, Error as ResponseError, UserType } from '../../../types';
import { fetchRepoItem, removeRepoItem } from '../../../operations/repo';

export default [
  // Middlewares
  ...hasPermission(Permission.repo),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { userId, itemId } = request.params;

      const user = await fetchUser(userId);
      if (!user) {
        return notFound(response, ResponseError.UserNotFound);
      }
      if (!user.scannedAt) {
        return methodNotSupported(response, ResponseError.NotScannedOrLocked);
      }

      if (user.type === UserType.player || user.type === UserType.coach) {
        if (!user.teamId) {
          return methodNotSupported(response, ResponseError.NotScannedOrLocked);
        }
        const team = await fetchTeam(user.teamId);
        if (!team?.lockedAt) {
          return methodNotSupported(response, ResponseError.NotScannedOrLocked);
        }
      }

      const item = await fetchRepoItem(itemId);
      if (!item) {
        return notFound(response, ResponseError.ItemNotFound);
      }
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
