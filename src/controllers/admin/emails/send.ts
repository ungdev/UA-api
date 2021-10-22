/* eslint-disable unicorn/no-nested-ternary */
import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { badRequest, created } from '../../../utils/responses';
import { hasPermission } from '../../../middlewares/authentication';
import { Error as ApiError, MailQuery } from '../../../types';
import { validateBody } from '../../../middlewares/validation';
import * as validators from '../../../utils/validators';
import { sendEmail, SerializedMail } from '../../../services/email';
import { serialize } from '../../../services/email/serializer';
import database from '../../../services/database';
import { getRequestInfo } from '../../../utils/users';

export default [
  // Middlewares
  ...hasPermission(),
  validateBody(
    Joi.object({
      preview: Joi.boolean().default(false),
      locked: Joi.boolean().optional(),
      tournamentId: validators.tournamentId.optional(),
      subject: Joi.string().required(),
      content: Joi.array()
        .items(
          Joi.object({
            title: Joi.string().required(),
            components: Joi.array().required(),
          }).required(),
        )
        .required()
        .error(new Error(ApiError.MalformedMailBody)),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const mail = request.body as MailQuery;
      const { user } = getRequestInfo(response);

      // Find mail adresses to send the mail to
      const mails = await database.user
        .findMany({
          where: mail.preview
            ? {
                id: user.id,
              }
            : {
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

      // Parallelize mails as it may take time
      // As every mail is generated on a user basis, we cannot catch
      // a mail format error as simply as usual. This is the reason
      // why we track the status of all sent mails.
      // If all mails are errored due to invalid syntax, it is most
      // likely that the sender did a mistake.
      const outgoingMails = await Promise.allSettled(
        mails.map(async (adress) => {
          let mailContent: SerializedMail;
          try {
            mailContent = await serialize({
              sections: mail.content,
              reason: null,
              title: {
                banner: mail.subject,
                highlight: mail.subject,
                short: mail.subject,
                topic: mail.preview ? `[PREVIEW]: ${mail.subject}` : mail.subject,
              },
              receiver: adress,
            });
          } catch {
            return Promise.reject(ApiError.MalformedMailBody);
          }
          return sendEmail(mailContent);
        }),
      );

      // Counts mail statuses
      const results = outgoingMails.reduce(
        (result, state) => {
          if (state.status === 'fulfilled')
            return {
              ...result,
              delivered: result.delivered + 1,
            };
          if (state.reason === ApiError.MalformedMailBody)
            return {
              ...result,
              malformed: result.malformed + 1,
            };
          return {
            ...result,
            undelivered: result.undelivered + 1,
          };
        },
        { malformed: 0, delivered: 0, undelivered: 0 },
      );

      // Respond to the request with the appropriate response code
      if (results.malformed && !results.delivered && !results.undelivered)
        return badRequest(response, ApiError.MalformedMailBody);

      if (results.delivered || !results.undelivered) return created(response, results);

      throw (<PromiseRejectedResult>(
        outgoingMails.find((result) => result.status === 'rejected' && result.reason !== ApiError.MalformedMailBody)
      )).reason;
    } catch (error) {
      return next(error);
    }
  },
];
