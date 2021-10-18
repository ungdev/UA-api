import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { success } from '../../../utils/responses';
import { hasPermission } from '../../../middlewares/authentication';
import { MailQuery, Permission } from '../../../types';
import { validateQuery } from '../../../middlewares/validation';
import database from '../../../services/database';
import { Log, User } from '.prisma/client';

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
            path: '/api/admin/emails',
          },
        },
        include: {
          user: true,
        },
      })) as (Log & {
        body: MailQuery;
        user: User;
      })[];
      return success(
        response,
        logs.map((log) => ({
          sender: log.user,
          subject: log.body.subject,
          content: log.body.content,
          tournamentId: log.body.tournamentId,
          locked: log.body.locked,
          sentAt: log.createdAt,
        })),
      );
    } catch (error) {
      return next(error);
    }
  },
];
