import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasPermission } from '../../../middlewares/authentication';
import { Error as ApiError, MailGeneralQuery } from '../../../types';
import { validateBody } from '../../../middlewares/validation';
import { sendGeneralMail } from '../../../services/email';
import { getRequestInfo } from '../../../utils/users';

export default [
  // Middlewares
  ...hasPermission(),
  validateBody(
    Joi.object({
      preview: Joi.boolean().default(false),
      generalMail: Joi.string().required(),
    }).error(
      (errors) =>
        errors.find((error) => error.message === ApiError.MalformedMailBody) ?? new Error(ApiError.InvalidMailOptions),
    ),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const mail = request.body as MailGeneralQuery;
      const { user } = getRequestInfo(response);

      let nbMailSent = await sendGeneralMail(mail.generalMail, mail.preview ? user : null);

      // TODO: change return to a created response
      return response.json({ message: `Sent ${nbMailSent} emails` });
    } catch (error) {
      return next(error);
    }
  },
];
