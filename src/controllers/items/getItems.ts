import { NextFunction, Request, Response } from 'express';
// import { isShopAllowed } from '../../middlewares/settings';
import { fetchUserItems } from '../../operations/item';
import { filterItem } from '../../utils/filters';
import { success } from '../../utils/responses';
import { getRequestInfo } from '../../utils/users';

export default [
  // Middlewares (commented out to allow users to access the list of their purchases)
  // isShopAllowed,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { user, team } = getRequestInfo(response);
      let result = await fetchUserItems(team, user || undefined);

      result = result.filter((item) => item.display);

      const items = result.map(filterItem);
      return success(response, items);
    } catch (error) {
      return next(error);
    }
  },
];
