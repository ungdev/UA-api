import { NextFunction, Request, Response } from 'express';
import { isShopAllowed } from '../../middlewares/settings';
import { fetchUserItems } from '../../operations/item';
import { filterItem } from '../../utils/filters';
import { success } from '../../utils/responses';
import { getRequestInfo } from '../../utils/users';

export default [
  // Middlewares
  isShopAllowed,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { team } = getRequestInfo(response);
      let items = await fetchUserItems(team);

      const result = items.map(filterItem);
      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
