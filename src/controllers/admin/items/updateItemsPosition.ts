import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { validateBody } from '../../../middlewares/validation';
import { notFound, success } from '../../../utils/responses';
import { Error, Permission } from '../../../types';
import { fetchPartners, updatePartnersPosition } from '../../../operations/partner';
import { fetchAllItems, updateItemsPosition } from '../../../operations/item';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),
  validateBody(
    Joi.object({
      items: Joi.array()
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
      const items = await fetchAllItems();

      for (const item of request.body.items) {
        if (!items.some((i) => i.id === item.id)) {
          return notFound(response, Error.NotFound);
        }
      }

      await updateItemsPosition(request.body.items);

      const result = await fetchAllItems();

      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
