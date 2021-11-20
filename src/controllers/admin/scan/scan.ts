import Joi from 'joi';
import { NextFunction, Request, Response } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission, Error as ResponseError, UserWithTeamAndTournamentInfo } from '../../../types';
import { badRequest, forbidden, notFound, success } from '../../../utils/responses';
import { decrypt } from '../../../utils/helpers';
import logger from '../../../utils/logger';
import { fetchUser, scanUser } from '../../../operations/user';
import { validateBody } from '../../../middlewares/validation';
import { filterUserWithTeamAndTournamentInfo } from '../../../utils/filters';
import { fetchTeamWithTournament } from '../../../operations/team';

export default [
  // Middlewares
  ...hasPermission(Permission.entry),
  validateBody(
    Joi.object({
      qrcode: Joi.string().required().error(new Error(ResponseError.NoQRCode)),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      // Retrieves the encoded qrcode in base64
      const { qrcode } = request.body;

      let userId;

      try {
        // Decode the base64 qrcode
        const decodedQrcode = Buffer.from(qrcode, 'base64');

        // Tries to decrypt the qrcode
        userId = decrypt(decodedQrcode);
      } catch (error) {
        logger.error(error);
        return badRequest(response, ResponseError.InvalidQRCode);
      }

      // Retrieve the user from the QR Code
      const user: Partial<UserWithTeamAndTournamentInfo> = await fetchUser(userId);

      if (!user) return notFound(response, ResponseError.UserNotFound);

      // Check if the user has paid
      if (!user.hasPaid) return forbidden(response, ResponseError.NotPaid);

      // Add team (if user has one)
      if (user.teamId) user.team = await fetchTeamWithTournament(user.teamId);

      // Check if the user has already validated
      if (user.scannedAt) return forbidden(response, ResponseError.UserAlreadyScanned);

      const scannedUser = await scanUser(user.id);
      user.scannedAt = scannedUser.scannedAt;

      return success(response, filterUserWithTeamAndTournamentInfo(<UserWithTeamAndTournamentInfo>user));
    } catch (error) {
      return next(error);
    }
  },
];
