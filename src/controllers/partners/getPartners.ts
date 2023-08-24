import { NextFunction, Request, Response } from 'express';
import { pick } from 'lodash';
import { fetchPartners } from '../../operations/partner';
import { success } from '../../utils/responses';

export default [
  // Middlewares

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      let result = await fetchPartners();

      result = result.filter((partner) => partner.display);

      // Don't pick the display field
      const partners = result.map((partner) => pick(partner, ['id', 'name', 'link']));

      return success(response, partners);
    } catch (error) {
      return next(error);
    }
  },
];
