import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { validateBody } from '../../../middlewares/validation';
import { notFound, success } from '../../../utils/responses';
import { Permission, Error } from '../../../types';
import { fetchPartners, updatePartnersPosition } from '../../../operations/partner';

export default [
  // Middlewares
  ...hasPermission(Permission.anim),
  validateBody(
    Joi.object({
      partners: Joi.array()
        .items(
          Joi.object({
            id: Joi.string().required(),
            position: Joi.number().required(),
          }),
        )
        .required(),
    }).required(),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      // Check if all partners exist
      const partners = await fetchPartners();

      for (const partner of request.body.partners) {
        if (!partners.some((p) => p.id === partner.id)) {
          return notFound(response, Error.NotFound);
        }
      }

      await updatePartnersPosition(request.body.partners);

      const result = await fetchPartners();

      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
