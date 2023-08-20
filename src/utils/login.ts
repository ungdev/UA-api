import { NextFunction, Request, Response } from 'express';
import bcrpyt from 'bcryptjs';
import { filterUser } from './filters';
import { forbidden, success, unauthenticated } from './responses';
import { generateToken } from './users';
import { fetchUser } from '../operations/user';
import { Error as ResponseError, UserType } from '../types';
import * as validators from './validators';

export async function loginAccount(request: Request, response: Response, next: NextFunction, admin = false) {
  try {
    const { login, password } = request.body;

    // Fetch the user depending on the email or the username
    let field;
    if (!validators.email.validate(login).error) {
      field = 'email';
    } else if (validators.username.validate(login).error) {
      return unauthenticated(response, ResponseError.InvalidCredentials);
    } else {
      field = 'username';
    }

    const user = await fetchUser(login, field);

    // Checks if the user exists
    if (!user) {
      return unauthenticated(response, ResponseError.InvalidCredentials);
    }

    if (user.registerToken) {
      return forbidden(response, ResponseError.EmailNotConfirmed);
    }

    if (user.type === UserType.attendant) {
      return forbidden(response, ResponseError.LoginAsAttendant);
    }

    // Compares the hash from the password given
    const isPasswordValid = await bcrpyt.compare(password, user.password);

    // If the password is not valid, rejects the request
    if (!isPasswordValid) {
      return unauthenticated(response, ResponseError.InvalidCredentials);
    }

    // If admin check that the user has any permissions
    if (admin && (!user.permissions || user.permissions.length === 0)) {
      return forbidden(response, ResponseError.LoginNotAllowed);
    }

    const token = generateToken(user);

    return success(response, {
      user: filterUser(user),
      token,
    });
  } catch (error) {
    return next(error);
  }
}
