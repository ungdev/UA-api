import { NextFunction, Request, Response } from 'express';
import { isShopAllowed } from '../../middlewares/settings';
import { fetchItems } from '../../operations/item';
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
      let items = await fetchItems();

      // Check if user is not in SSBU tournament
      if (!team || team.tournamentId == null || team.tournamentId !== 'ssbu') {
        // Remove the SSBU discount
        items = items.filter((element) => element.id !== 'discount-switch-ssbu');
      }

      const result = items.map(filterItem);
      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
