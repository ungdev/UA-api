import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasPermission } from '../../../middlewares/authentication';
import { fetchUser } from '../../../operations/user';
import { fetchTeam } from '../../../operations/team';
import { validateQuery } from '../../../middlewares/validation';
import { methodNotSupported, success } from '../../../utils/responses';
import { Permission, Error as ResponseError, UserSearchQuery, UserType } from '../../../types';
import { fetchRepoLogs } from '../../../operations/repo';

export default [
  // Middlewares
  ...hasPermission(Permission.repo),
  validateQuery(
    Joi.object({
      userId: Joi.string().required(),
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

      const logs = await fetchRepoLogs(userId, itemId);
      return success(response, {
        logs: logs.map((log) => ({
          itemId: log.itemId,
          action: log.action,
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
