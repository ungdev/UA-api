import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { validateBody } from '../../../middlewares/validation';
import { notFound, success } from '../../../utils/responses';
import { Error, Permission } from '../../../types';
import { fetchPartners, updatePartner } from '../../../operations/partner';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),
  validateBody(
    Joi.object({
      name: Joi.string().optional(),
      link: Joi.string().optional(),
      description: Joi.string().optional(),
      display: Joi.boolean().optional(),
      position: Joi.number().optional(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      if (!(await fetchPartners()).some((partner) => partner.id === request.params.partnerId)) {
        return notFound(response, Error.NotFound);
      }

      const result = await updatePartner(request.params.partnerId, request.body);

      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
