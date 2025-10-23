import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { badRequest, created } from '../../../utils/responses';
import { hasPermission } from '../../../middlewares/authentication';
import { Error as ApiError, MailQuery } from '../../../types';
import { validateBody } from '../../../middlewares/validation';
import { sendEmail, SerializedMail, serialize } from '../../../services/email';
import { getRequestInfo } from '../../../utils/users';

export default [
  // Middlewares
  ...hasPermission(),
  validateBody(
    Joi.object({
      preview: Joi.boolean().default(false),
      emails: Joi.array().items(Joi.string().email()).required(),
      subject: Joi.string().required(),
      highlight: Joi.object({
        title: Joi.string().required(),
        intro: Joi.string().required(),
      }).required(),
      reason: Joi.string().optional(),
      content: Joi.array()
        .items(
          Joi.object({
            title: Joi.string().required(),
            components: Joi.array().required(),
          }).required(),
        )
        .required()
        .error(new Error(ApiError.MalformedMailBody)),
    }).error(
      (errors) =>
        errors.find((error) => error.message === ApiError.MalformedMailBody) ?? new Error(ApiError.InvalidMailOptions),
    ),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const mail = request.body as MailQuery & { emails?: string[] };
      const { user } = getRequestInfo(response);

      let mails: (string | null)[];

      if (mail.preview) {
        // En mode preview, envoyer seulement à l'utilisateur admin connecté
        mails = [user.email];
      } else if (mail.emails && mail.emails.length > 0) {
        // Si des emails personnalisés sont fournis, les utiliser
        mails = mail.emails;
      } else {
        throw ApiError.InvalidMailOptions;
      }

      // Filtrer les emails null/undefined
      const validEmails = mails.filter((email): email is string => email !== null && email !== undefined);

      if (validEmails.length === 0) {
        return badRequest(response, ApiError.InvalidMailOptions);
      }

      // Parallelize mails as it may take time
      const outgoingMails = await Promise.allSettled(
        validEmails.map(async (address) => {
          let mailContent: SerializedMail;
          try {
            mailContent = await serialize({
              sections: mail.content,
              reason: mail.reason,
              title: {
                banner: mail.subject,
                highlight: mail.highlight.title,
                short: mail.highlight.intro,
                topic: mail.preview ? `[PREVIEW]: ${mail.subject}` : mail.subject,
              },
              receiver: address,
            });
          } catch {
            throw ApiError.MalformedMailBody;
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
