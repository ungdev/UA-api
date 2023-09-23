import { NextFunction, Request, Response } from 'express';
import { fetchPartners } from '../../../operations/partner';
import { success } from '../../../utils/responses';
import { Permission } from '../../../types';
import { hasPermission } from '../../../middlewares/authentication';

export default [
  // Middlewares
  ...hasPermission(Permission.anim),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await fetchPartners();

      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
