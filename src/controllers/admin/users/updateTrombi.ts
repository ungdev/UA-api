import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { validateBody } from '../../../middlewares/validation';
import { badRequest, success } from '../../../utils/responses';
import { getRequestInfo } from '../../../utils/users';
import { updateTrombi } from '../../../operations/user';
import { hasPermission } from '../../../middlewares/authentication';
import { Error, Permission } from '../../../types';

// Allow to upload a file to an external API
export default [
  // Middlewares
  ...hasPermission(Permission.orga),
  validateBody(
    Joi.object({
      displayName: Joi.boolean(),
      displayUsername: Joi.boolean(),
      displayPhoto: Joi.boolean(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      if (!request.body.displayName && !request.body.displayUsername) {
        return badRequest(response, Error.ShowNameOrPseudo);
      }
      const { user } = getRequestInfo(response);

      const filename = await updateTrombi(
        user,
        request.body.displayName,
        request.body.displayPhoto,
        request.body.displayUsername,
      );

      return success(response, { filename });
    } catch (error) {
      return next(error);
    }
  },
];
