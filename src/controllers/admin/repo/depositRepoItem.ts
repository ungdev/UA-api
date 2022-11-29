import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasPermission } from '../../../middlewares/authentication';
import { fetchUser } from '../../../operations/user';
import { validateBody, validateQuery } from '../../../middlewares/validation';
import { created, methodNotSupported, notFound } from '../../../utils/responses';
import { Permission, Error as ResponseError, UserSearchQuery, UserType, RepoItemType } from '../../../types';
import { addRepoItem, addRepoItems, findPC } from '../../../operations/repo';
import { fetchTeam } from '../../../operations/team';
import nanoid from '../../../utils/nanoid';
import { type } from '../../../utils/validators';

export default [
  // Middlewares
  ...hasPermission(Permission.repo),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      let userId = request.params.userId;
      const items: { type: RepoItemType; zone: string }[] = request.body.items;

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

      let isStoringPC = !!(await findPC(user.id));
      if (
        items.some((item) => {
          if (item.type == 'computer' && isStoringPC) {
            return true;
          } else if (item.type == 'computer') {
            isStoringPC = true;
          }
          return false;
        })
      ) {
        return methodNotSupported(response, ResponseError.AlreadyHaveComputer);
      }

      await addRepoItems(
        userId,
        items.map((item) => ({ itemType: item.type, itemZone: item.zone })),
      );
      return created(response);
    } catch (error) {
      return next(error);
    }
  },
];
