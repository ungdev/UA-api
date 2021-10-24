import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { success } from '../../../utils/responses';
import { hasPermission } from '../../../middlewares/authentication';
import { User, MailQuery, Permission, Log } from '../../../types';
import { validateQuery } from '../../../middlewares/validation';
import database from '../../../services/database';
import env from '../../../utils/env';
import { filterAdminAccount } from '../../../utils/filters';

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
        user: User;
      })[];
      return success(
        response,
        logs.map((log) => ({
          sender: filterAdminAccount(log.user),
          subject: log.body.subject,
          content: log.body.content,
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
