import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { validateBody } from '../../../middlewares/validation';
import { success } from '../../../utils/responses';
import { Permission } from '../../../types';
import { uploadFile } from '../../../operations/upload';

// Allow to upload a file to an external API
export default [
  // Middlewares
  ...hasPermission(Permission.anim),
  validateBody(
    Joi.object({
      name: Joi.string().required(),
      path: Joi.string().required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await uploadFile(request.file, request.body.path, request.body.name);

      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
