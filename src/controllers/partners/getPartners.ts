import { NextFunction, Request, Response } from 'express';
import { fetchPartners } from '../../operations/partner';
import { success } from '../../utils/responses';

export default [
  // Middlewares

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await fetchPartners();

      result.filter((partner) => partner.display);

      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
