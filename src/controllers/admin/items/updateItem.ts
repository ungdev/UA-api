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
      attribute: Joi.string(),
      price: Joi.number().integer(),
      reducedPrice: Joi.number().integer(),
      infos: Joi.string(),
      image: Joi.string(),
      stockDifference: Joi.number().integer(),
      availableFrom: Joi.date(),
      availableUntil: Joi.date(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
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
      } = request.body as {
        name: string;
        category: ItemCategory;
        attribute: string;
        price: number;
        reducedPrice: number;
        infos: string;
        image: string;
        stockDifference: number;
        availableFrom: Date;
        availableUntil: Date;
      };

      if (!(await fetchAllItems()).some((item) => item.id === request.params.itemId)) {
        return notFound(response, Error.ItemNotFound);
      }

      const item = await updateAdminItem(
        request.params.itemId,
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
      );

      return success(response, filterAdminItem(item));
    } catch (error) {
      return next(error);
    }
  },
];
