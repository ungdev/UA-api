import Joi from 'joi';
import { NextFunction, Request, Response } from 'express';
import { isAuthenticated } from '../../middlewares/authentication';
import { validateBody } from '../../middlewares/validation';
import * as validators from '../../utils/validators';
import { getRequestInfo } from '../../utils/users';
import { updateUserFfsu } from '../../operations/user';
import { conflict, success } from '../../utils/responses';
import { filterUser } from '../../utils/filters';
import { Error } from '../../types';

export default [
  // Middlewares
  ...isAuthenticated,

  validateBody(
    Joi.object({
      ffsuLicense: validators.ffsuLicense.allow(null),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    const { ffsuLicense } = request.body;

    try {
      const { user } = getRequestInfo(response);

      const updatedUser = await updateUserFfsu(user.id, { ffsuLicense });

      return success(response, filterUser(updatedUser));
    } catch (error) {
      if (error.code === 'P2002' && error.meta && error.meta.target === 'users_ffsuLicence_key') {
        return conflict(response, Error.FfsuLicenseAlreadyExists);
      }
      return next(error);
    }
  },
];
