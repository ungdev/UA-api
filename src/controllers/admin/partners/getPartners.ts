import { NextFunction, Request, Response } from 'express';
import { fetchPartners } from '../../../operations/partner';
import { success } from '../../../utils/responses';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission } from '../../../types';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),

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
