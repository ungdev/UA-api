import Joi from 'joi';
import { NextFunction, Request, Response } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission, Error } from '../../../types';
import { badRequest, forbidden, noContent, notFound, success } from '../../../utils/responses';
import { decrypt } from '../../../utils/helpers';
import logger from '../../../utils/logger';
import { fetchUser, scanUser } from '../../../operations/user';
import { validateBody } from '../../../middlewares/validation';
import { filterUser } from '../../../utils/filters';

export default [
  // Middlewares
  ...hasPermission(Permission.entry),
  validateBody(
    Joi.object({
      qrcode: Joi.string().required(),
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
        return badRequest(response, Error.InvalidBody);
      }

      // Retrieve the user from the QR Code
      const user = await fetchUser(userId);

      if (!user) return notFound(response, Error.UserNotFound);

      // Check if the user has paid
      if (!user.hasPaid) return forbidden(response, Error.NotPaid);

      // Check if the user has already validated
      if (user.scannedAt) return forbidden(response, Error.UserAlreadyScanned);

      await scanUser(user.id);

      return success(response, { ...filterUser(user), customMessage: user.customMessage });
    } catch (error) {
      return next(error);
    }
  },
];
