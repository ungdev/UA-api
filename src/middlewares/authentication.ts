import { Response, NextFunction, Request } from 'express';
import { getToken } from '../utils/user';
import { unauthorized, unauthenticated, badRequest } from '../utils/responses';
import { Permissions, UserRequest, Error, UserType } from '../types';
import { fetchUsers } from '../operations/user';

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
  let error = 'no error';

  // Test if some fields are missing.
  error = request.body.firstname ? error : Error.MissingFirstname;
  error = request.body.lastname ? error : Error.MissingLastname;
  error = request.body.email ? error : Error.MissingEmail;
  error = request.body.password ? error : Error.MissingPassword;
  error = request.body.type ? error : Error.MissingUserType;
  if (error !== 'no error') {
    return badRequest(response, error as Error);
  }

  // Test the format of the email adress.
  // eslint-disable-next-line security/detect-unsafe-regex
  const re = /^(([^\s"(),.:;<>@[\\\]]+(\.[^\s"(),.:;<>@[\\\]]+)*)|(".+"))@((\[(?:\d{1,3}\.){3}\d{1,3}])|(([\dA-Za-z-]+\.)+[A-Za-z]{2,}))$/;
  if (!re.test(request.body.email.toLowerCase())) {
    return badRequest(response, Error.InvalidEmail);
  }

  // Test if type is a UserType
  if (
    request.body.type !== UserType.Coach &&
    request.body.type !== UserType.Orga &&
    request.body.type !== UserType.Player &&
    request.body.type !== UserType.Visitor
  ) {
    return badRequest(response, Error.InvalidUserType);
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
