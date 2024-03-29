import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { success } from '../../../utils/responses';
import { hasPermission } from '../../../middlewares/authentication';
import { MailQuery, Permission, Log, RawUser } from '../../../types';
import { validateQuery } from '../../../middlewares/validation';
import database from '../../../services/database';
import env from '../../../utils/env';
import { filterAdminAccount } from '../../../utils/filters';
import { deserializePermissions } from '../../../utils/helpers';

export default [
  // Middlewares
  ...hasPermission(Permission.anim),
  validateQuery(Joi.object({})),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const logs = (await database.log.findMany({
        where: {
          AND: {
            method: 'POST',
            path: `${env.api.prefix}${env.api.prefix === '/' ? '' : '/'}admin/emails`,
          },
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })) as (Log & {
        body: MailQuery;
        user: RawUser;
      })[];
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
