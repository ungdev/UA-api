import { NextFunction, Request, Response } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { Error, Permission } from '../../../types';
import { notFound, success } from '../../../utils/responses';
import { filterAdminItem } from '../../../utils/filters';
import { fetchAllItems, findAdminItem } from '../../../operations/item';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),
  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      if (!(await fetchAllItems()).some((item) => item.id === request.params.itemId)) {
        return notFound(response, Error.ItemNotFound);
      }

      const item = await findAdminItem(request.params.itemId);

      return success(response, filterAdminItem(item));
    } catch (error) {
      return next(error);
    }
  },
];
