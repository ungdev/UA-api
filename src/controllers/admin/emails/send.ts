/* eslint-disable unicorn/no-nested-ternary */
import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { noContent } from '../../../utils/responses';
import { hasPermission } from '../../../middlewares/authentication';
import { MailQuery, Permission } from '../../../types';
import { validateQuery } from '../../../middlewares/validation';
import * as validators from '../../../utils/validators';
import { sendEmail } from '../../../services/email';
import { serialize } from '../../../services/email/serializer';
import database from '../../../services/database';

export default [
  // Middlewares
  ...hasPermission(Permission.anim),
  validateQuery(
    Joi.object({
      locked: Joi.boolean().optional(),
      tournamentId: validators.tournamentId.optional(),
      subject: Joi.string().required(),
      content: Joi.array().required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const mail = request.query as MailQuery;

      const mails = await database.user
        .findMany({
          where: {
            team: {
              ...(mail.locked
                ? {
                    NOT: {
                      lockedAt: null,
                    },
                  }
                : mail.locked === false
                ? { lockedAt: null }
                : {}),
              tournamentId: mail.tournamentId,
            },
          },
          select: {
            email: true,
          },
        })
        .then((mailWrappers) => mailWrappers.map((mailWrapper) => mailWrapper.email));

      for (const adress of mails)
        await sendEmail(
          await serialize({
            sections: mail.content,
            reason: null,
            title: {
              banner: mail.subject,
              highlight: mail.subject,
              short: mail.subject,
              topic: mail.subject,
            },
            receiver: adress,
          }),
        );

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
