import { Request, Response, NextFunction } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { success } from '../../../utils/responses';
import { Permission } from '../../../types';
import { deleteFile } from '../../../operations/upload';

// Allow to upload a file to an external API
export default [
  // Middlewares
  ...hasPermission(Permission.anim),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await deleteFile(request.params.path);

      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
