import { NextFunction, Request, Response } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission } from '../../../types';
import { success } from '../../../utils/responses';
import { filterAdminItem } from '../../../utils/filters';
import { fetchAllItems } from '../../../operations/item';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),
  // Controller
  async (_request: Request, response: Response, next: NextFunction) => {
    try {
      const items = await fetchAllItems();

      return success(response, items.map(filterAdminItem));
    } catch (error) {
      return next(error);
    }
  },
];
