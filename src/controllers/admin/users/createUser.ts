import Joi from 'joi';
import { NextFunction, Request, Response } from 'express';
import { UserAge } from '@prisma/client';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission, Error } from '../../../types';
import { conflict, forbidden, success } from '../../../utils/responses';
import { createUser, removeUserRegisterToken } from '../../../operations/user';
import { validateBody } from '../../../middlewares/validation';
import * as validators from '../../../utils/validators';
import { getRequestInfo } from '../../../utils/users';

export default [
  // Middlewares
  ...hasPermission(Permission.anim),
  validateBody(
    Joi.object({
      permissions: Joi.array().required().items(validators.permission),
      customMessage: Joi.string().allow(null).required(),
      username: validators.username.required(),
      lastname: validators.lastname.required(),
      firstname: validators.firstname.required(),
      email: validators.email.required(),
      password: validators.password.required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { permissions, customMessage, email, username, firstname, lastname, password } = request.body;

      // Check that permissions are not in the request body or that the initiator
      // is admin
      const initiator = getRequestInfo(response).user;
      if (permissions && !initiator.permissions.includes(Permission.admin)) {
        return forbidden(response, Error.NoPermission);
      }

      const createdUser = await createUser({
        permissions,
        customMessage,
        email,
        username,
        firstname,
        lastname,
        password,
        age: UserAge.adult,
      });

      await removeUserRegisterToken(createdUser.id);

      return success(response, { ...createdUser });
    } catch (error) {
      if (error.code === 'P2002' && error.meta) {
        // eslint-disable-next-line default-case
        switch (error.meta.target) {
          case 'users_email_key': {
            return conflict(response, Error.EmailAlreadyExists);
          }
          case 'users_username_key': {
            return conflict(response, Error.UsernameAlreadyExists);
          }
        }
      }

      return next(error);
    }
  },
];
