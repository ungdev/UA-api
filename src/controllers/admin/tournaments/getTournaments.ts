import { NextFunction, Request, Response } from 'express';
import { success } from '../../../utils/responses';
import { fetchTournaments } from '../../../operations/tournament';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission } from '../../../types';

export default [
  // Middlewares
  ...hasPermission(Permission.anim),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await fetchTournaments();

      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
