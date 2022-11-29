import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasPermission } from '../../../middlewares/authentication';
import { fetchUser } from '../../../operations/user';
import { fetchTeam } from '../../../operations/team';
import { validateQuery } from '../../../middlewares/validation';
import { decrypt } from '../../../utils/helpers';
import logger from '../../../utils/logger';
import { badRequest, methodNotSupported, notFound, success } from '../../../utils/responses';
import { Permission, Error as ResponseError, UserSearchQuery, UserType } from '../../../types';
import { fetchRepoItems } from '../../../operations/repo';

export default [
  // Middlewares
  ...hasPermission(Permission.repo),
  validateQuery(
    Joi.object({
      id: Joi.string().required(),
    }).required(),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      let userId = (request.query as UserSearchQuery & { id: string }).id;
      try {
        const buffer = Buffer.from(userId, 'base64');
        // Tries to decrypt the qrcode
        userId = decrypt(buffer);
      } catch (error) {
        logger.error(error);
        return badRequest(response, ResponseError.InvalidQRCode);
      }

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

      const items = await fetchRepoItems(userId);
      return success(response, {
        firstname: user.firstname,
        lastname: user.lastname,
        username: user.username,
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
