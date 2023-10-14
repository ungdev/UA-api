import { Request, Response, NextFunction } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { noContent, notFound } from '../../../utils/responses';
import { Error } from '../../../types';
import { fetchPartners, removePartner } from '../../../operations/partner';

export default [
  // Middlewares
  ...hasPermission(),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      if (!(await fetchPartners()).some((partner) => partner.id === request.params.partnerId)) {
        return notFound(response, Error.NotFound);
      }

      await removePartner(request.params.partnerId);

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
