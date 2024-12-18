import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasPermission } from '../../../middlewares/authentication';
import { Error as ApiError, MailTemplateQuery } from '../../../types';
import { validateBody } from '../../../middlewares/validation';
import { sendMailsFromTemplate } from '../../../services/email';
import { getRequestInfo } from '../../../utils/users';

export default [
  // Middlewares
  ...hasPermission(),
  validateBody(
    Joi.object({
      preview: Joi.boolean().default(false),
      templateMail: Joi.string().required(),
      targets: Joi.array().items(Joi.any()).required(),
    }).error(
      (errors) =>
        errors.find((error) => error.message === ApiError.MalformedMailBody) ?? new Error(ApiError.InvalidMailOptions),
    ),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const mail = request.body as MailTemplateQuery;
      const { user } = getRequestInfo(response);

      // TODO: Fix as array depends on the template...
      await sendMailsFromTemplate(mail.templateMail, mail.preview ? [user] : mail.targets);

      // TODO: change return to a created response
      return response.json({ message: `Sent ${mail.targets.length} emails` });
    } catch (error) {
      return next(error);
    }
  },
];
