import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { validateBody } from '../../../middlewares/validation';
import { created } from '../../../utils/responses';
import { addPartner } from '../../../operations/partner';
import { Permission } from '../../../types';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),
  validateBody(
    Joi.object({
      name: Joi.string().required(),
      link: Joi.string().required(),
      display: Joi.boolean().optional(),
      position: Joi.number().required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await addPartner(request.body);

      return created(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
