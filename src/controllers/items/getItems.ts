import { NextFunction, Request, Response } from 'express';
import { isShopAllowed } from '../../middlewares/settings';
import { fetchItems } from '../../operations/item';
import { filterItem } from '../../utils/filters';
import { success } from '../../utils/responses';

export default [
  // Middlewares
  isShopAllowed,
  
  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const items = await fetchItems();

      const result = items.map(filterItem);
      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
