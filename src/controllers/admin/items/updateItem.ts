import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasPermission } from '../../../middlewares/authentication';
import { Error, Permission } from '../../../types';
import { notFound, success } from '../../../utils/responses';
import { filterAdminItem } from '../../../utils/filters';
import { validateBody } from '../../../middlewares/validation';
import { fetchAllItems, updateAdminItem } from '../../../operations/item';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),
  validateBody(
    Joi.object({
      newStock: Joi.number().integer(),
      availableFrom: Joi.date(),
      availableUntil: Joi.date(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { newStock, availableFrom, availableUntil } = request.body as {
        newStock: number;
        availableFrom: Date;
        availableUntil: Date;
      };

      if (!(await fetchAllItems()).some((item) => item.id === request.params.itemId)) {
        return notFound(response, Error.ItemNotFound);
      }

      const item = await updateAdminItem(request.params.itemId, newStock, availableFrom, availableUntil);

      return success(response, filterAdminItem(item));
    } catch (error) {
      return next(error);
    }
  },
];
