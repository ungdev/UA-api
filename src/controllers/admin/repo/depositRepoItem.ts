import { NextFunction, Request, Response } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { fetchUser } from '../../../operations/user';
import { created, methodNotSupported, notFound } from '../../../utils/responses';
import { Permission, Error as ResponseError, UserType, RepoItemType } from '../../../types';
import { addRepoItems, findPC } from '../../../operations/repo';
import { fetchTeam } from '../../../operations/team';

export default [
  // Middlewares
  ...hasPermission(Permission.repo),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { userId } = request.params;
      const { items }: { items: { type: RepoItemType; zone: string }[] } = request.body;

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
          if (item.type === 'computer' && isStoringPC) {
            return true;
          }
          if (item.type === 'computer') {
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
