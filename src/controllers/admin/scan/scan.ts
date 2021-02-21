import { NextFunction, Request, Response } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission, Error } from '../../../types';
import { badRequest, forbidden, noContent, notFound } from '../../../utils/responses';
import { decodeFromBase64, decryptQrCode } from '../../../utils/helpers';
import logger from '../../../utils/logger';
import { fetchUser, scanUser } from '../../../operations/user';

export default [
  // Middlewares
  ...hasPermission(Permission.entry),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      // Retrieves the encoded qrcode in base64
      const encodedQrcode = request.params.qrcode;

      let userId;

      try {
        // Tries to decode the qrcode to get encrypted data as a buffer
        const encryptedQrcode = decodeFromBase64(encodedQrcode);

        // Tries to decrypt the qrcode
        userId = decryptQrCode(encryptedQrcode);
      } catch (error) {
        logger.error(error);
        return badRequest(response, Error.InvalidParameters);
      }

      // Retieve the user from the QR Code
      const user = await fetchUser(userId);

      if (!user) return notFound(response, Error.UserNotFound);

      // Check if the user has already validated
      if (user.scannedAt) return forbidden(response, Error.UserAlreadyScanned);

      await scanUser(user.id);

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
