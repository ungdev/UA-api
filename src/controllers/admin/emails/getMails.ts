import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { success } from '../../../utils/responses';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission } from '../../../types';
import { validateQuery } from '../../../middlewares/validation';
import { filterAdminAccount } from '../../../utils/filters';
import { deserializePermissions } from '../../../utils/helpers';
import { getEmailsLogs } from '../../../services/email';

export default [
  // Middlewares
  ...hasPermission(Permission.anim),
  validateQuery(Joi.object({})),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const logs = await getEmailsLogs();
      return success(
        response,
        logs.map((log) => ({
          sender: filterAdminAccount({
            ...log.user,
            permissions: deserializePermissions(log.user.permissions),
          }),
          subject: log.body.subject,
          content: log.body.content,
          highlight: log.body.highlight,
          reason: log.body.reason,
          tournamentId: log.body.tournamentId,
          locked: log.body.locked,
          sentAt: log.createdAt,
          preview: log.body.preview,
        })),
      );
    } catch (error) {
      return next(error);
    }
  },
];
