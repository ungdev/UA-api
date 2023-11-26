import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { validateBody } from '../../../middlewares/validation';
import { forbidden, success } from '../../../utils/responses';
import { Error, Permission } from '../../../types';
import { uploadFile } from '../../../operations/upload';
import { getRequestInfo } from '../../../utils/users';

// Allow to upload a file to an external API
export default [
  // Middlewares
  ...hasPermission(Permission.orga),
  validateBody(
    Joi.object({
      name: Joi.string().required(),
      path: Joi.string().required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const initiator = getRequestInfo(response).user;

      if (
        request.body.path !== 'orga' &&
        !initiator.permissions.includes(Permission.admin) &&
        !initiator.permissions.includes(Permission.anim)
      ) {
        return forbidden(response, Error.NoPermission);
      }

      const result = await uploadFile(request.file, request.body.path, request.body.name);

      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
