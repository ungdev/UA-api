import { Response, NextFunction, Request } from 'express';
import { getToken } from '../utils/user';
import { unauthorized, unauthenticated, badRequest } from '../utils/responses';
import { Permissions, UserRequest, Error } from '../types';
import { fetchUsers } from '../operations/user';
import { userRegisterValidator } from '../validator';

// Checks the user is authenticated. If not, it will return an error
export const isAuthenticated = () => async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  const token = getToken(request);
  if (token) {
    return next();
  }

  return unauthenticated(response);
};

// Checks the user has the given permission. If not, it will return an error
export const hasPermission = (permissions: Permissions) => async (
  request: UserRequest,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  const { user } = request;

  if (user) {
    if (user.permissions === permissions || user.permissions === Permissions.Admin) {
      return next();
    }
    return unauthorized(response);
  }

  return unauthenticated(response);
};

export const isRegisterBodyValid = () => (request: Request, response: Response, next: NextFunction): void => {
  const { error } = userRegisterValidator.validate(request.body);
  if (error) {
    // @ts-ignore
    return badRequest(response, error.message);
  }
  return next();
};

// Test if the email and username are already used by an other user.
export const isUserUnique = () => async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  const sameEmail = await fetchUsers({
    where: {
      email: {
        equals: request.body.email,
      },
    },
  });
  if (sameEmail.length !== 0) {
    return badRequest(response, Error.EmailAlreadyTaken);
  }

  const sameUsername = await fetchUsers({
    where: {
      username: {
        equals: request.body.username,
      },
    },
  });
  if (sameUsername.length !== 0 && request.body.username) {
    return badRequest(response, Error.UsernameAlreadyTaken);
  }

  return next();
};
