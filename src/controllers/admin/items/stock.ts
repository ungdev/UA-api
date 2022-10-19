import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasPermission } from '../../../middlewares/authentication';
import { Error, Permission } from '../../../types';
import { notFound, success } from '../../../utils/responses';
import { filterAdminItem } from '../../../utils/filters';
import { validateBody } from '../../../middlewares/validation';
import { fetchAllItems, updateAdminItemStock } from '../../../operations/item';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),
  validateBody(
    Joi.object({
      newStock: Joi.number().integer().required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { newStock } = request.body as { newStock: number };

      if ((await fetchAllItems()).filter((item) => item.id === request.params.itemId).length === 0) {
        return notFound(response, Error.ItemNotFound);
      }

      const item = await updateAdminItemStock(request.params.itemId, newStock);

      return success(response, filterAdminItem(item));
    } catch (error) {
      return next(error);
    }
  },
];
