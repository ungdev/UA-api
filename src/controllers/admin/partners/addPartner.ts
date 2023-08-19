import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { validateBody } from '../../../middlewares/validation';
import { success } from '../../../utils/responses';
import { Permission } from '../../../types';
import { addPartner } from '../../../operations/partner';

export default [
  // Middlewares
  ...hasPermission(Permission.anim),
  validateBody(
    Joi.object({
      name: Joi.string().required(),
      link: Joi.string().required(),
      display: Joi.boolean().optional(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const result = await addPartner(request.body);

      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
