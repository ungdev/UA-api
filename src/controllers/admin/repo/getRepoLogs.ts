import { NextFunction, Request, Response } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { fetchUser } from '../../../operations/user';
import { fetchTeam } from '../../../operations/team';
import { methodNotSupported, notFound, success } from '../../../utils/responses';
import { Permission, Error as ResponseError, UserType } from '../../../types';
import { fetchRepoLogs } from '../../../operations/repo';

export default [
  // Middlewares
  ...hasPermission(Permission.repo),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { userId } = request.params;

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
      } else {
        return methodNotSupported(response, ResponseError.OnlyPlayersAllowed);
      }

      const logs = await fetchRepoLogs(userId);
      return success(response, {
        logs: logs.map((log) => ({
          itemType: log.item.type,
          itemId: log.itemId,
          action: log.action,
          zone: log.item.zone,
          timestamp: log.timestamp,
          agent: {
            firstname: user.firstname,
            lastname: user.lastname,
          },
        })),
      });
    } catch (error) {
      return next(error);
    }
  },
];
