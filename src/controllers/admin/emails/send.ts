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
  (request: Request, response: Response, next: NextFunction) => {
    try {
      const mail = request.body as MailGeneralQuery;
      const { user } = getRequestInfo(response);

      return sendGeneralMail(mail.generalMail, mail.preview ? user : null);
    } catch (error) {
      return next(error);
    }
  },
];
