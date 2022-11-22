import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasPermission } from '../../../middlewares/authentication';
import { fetchUser } from '../../../operations/user';
import { fetchTeam } from '../../../operations/team';
import { validateQuery } from '../../../middlewares/validation';
import { decrypt } from '../../../utils/helpers';
import logger from '../../../utils/logger';
import { badRequest, methodNotSupported, success } from '../../../utils/responses';
import { Permission, Error as ResponseError, UserSearchQuery, UserType } from '../../../types';
import { fetchRepoItems } from '../../../operations/repo';

export default [
  // Middlewares
  ...hasPermission(Permission.repo),
  validateQuery(
    Joi.object({
      id: Joi.string().optional(),
    }).required(),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      let { userId } = request.query as UserSearchQuery & { id: string };

      try {
        const buffer = Buffer.from(userId);
        // Tries to decrypt the qrcode
        userId = decrypt(buffer);
      } catch (error) {
        logger.error(error);
        return badRequest(response, ResponseError.InvalidQRCode);
      }

      const user = await fetchUser(userId);
      const team = await fetchTeam(user.teamId);
      if (!user.scannedAt || ((user.type === UserType.player || user.type === UserType.coach) && !team.lockedAt)) {
        return methodNotSupported(response, ResponseError.NotScannedOrLocked);
      }

      const items = await fetchRepoItems(userId);
      return success(response, {
        fistname: user.firstname,
        lastname: user.lastname,
        place: user.place,
        id: user.id,
        repoItems: items.map((item) => ({
          type: item.type,
          id: item.id,
          zone: item.zone,
        })),
      });
    } catch (error) {
      return next(error);
    }
  },
];
