import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { success } from '../../../utils/responses';
import { hasPermission } from '../../../middlewares/authentication';
import { LogSearchQuery, Permission } from '../../../types';
import { fetchLogs } from '../../../operations/log';
import { validateQuery } from '../../../middlewares/validation';
import { id } from '../../../utils/validators';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),
  validateQuery(Joi.object({ page: Joi.number().required(), userId: id.optional(), teamId: id.optional() })),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const query = request.query as unknown as LogSearchQuery;
      const [logs, count] = await fetchLogs(query);

      return success(response, { logs, pageIndex: query.page, maxPages: Math.ceil(count) });
    } catch (error) {
      return next(error);
    }
  },
];
