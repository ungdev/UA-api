import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasPermission } from '../../../middlewares/authentication';
import { Error, ItemCategory, Permission } from '../../../types';
import { notFound, success } from '../../../utils/responses';
import { filterAdminItem } from '../../../utils/filters';
import { validateBody } from '../../../middlewares/validation';
import { fetchAllItems, updateAdminItem } from '../../../operations/item';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),
  validateBody(
    Joi.object({
      name: Joi.string(),
      category: Joi.string().valid(ItemCategory.rent, ItemCategory.supplement, ItemCategory.ticket),
      attribute: Joi.string().allow(null),
      price: Joi.number().integer(),
      reducedPrice: Joi.number().integer().allow(null),
      infos: Joi.string().allow(null),
      image: Joi.boolean(),
      stockDifference: Joi.number().integer().allow(null),
      availableFrom: Joi.date().allow(null),
      availableUntil: Joi.date().allow(null),
      display: Joi.boolean(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const oldItem = (await fetchAllItems()).find((item) => item.id === request.params.itemId);

      const {
        name,
        category,
        attribute,
        price,
        reducedPrice,
        infos,
        image,
        stockDifference,
        availableFrom,
        availableUntil,
        display,
      } = request.body as Partial<{
        name: string;
        category: ItemCategory;
        attribute: string | null;
        price: number;
        reducedPrice: number | null;
        infos: string | null;
        image: boolean;
        stockDifference: number | null;
        availableFrom: Date | null;
        availableUntil: Date | null;
        display: boolean;
      }>;

      if (!oldItem) {
        return notFound(response, Error.ItemNotFound);
      }

      const item = await updateAdminItem(request.params.itemId, {
        name,
        category,
        attribute,
        price,
        reducedPrice,
        infos,
        image,
        stockDifference,
        availableFrom,
        availableUntil,
        display,
      });

      return success(response, filterAdminItem(item));
    } catch (error) {
      return next(error);
    }
  },
];
