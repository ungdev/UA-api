import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { success } from '../../../utils/responses';
import { hasPermission } from '../../../middlewares/authentication';
import { LogSearchQuery, Permission } from '../../../types';
import { fetchLogs } from '../../../operations/log';
import { validateQuery } from '../../../middlewares/validation';
import { id } from '../../../utils/validators';
import env from '../../../utils/env';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),
  validateQuery(Joi.object({ page: Joi.number().required(), userId: id.optional(), teamId: id.optional() })),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const logSearch = request.query as LogSearchQuery;
      const [logs, count] = await fetchLogs(logSearch);

      return success(response, {
        logs,
        pageIndex: logSearch.page,
        count,
        pageCount: Math.ceil(count / env.api.itemsPerPage),
      });
    } catch (error) {
      return next(error);
    }
  },
];
