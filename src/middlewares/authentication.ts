import { Response, NextFunction, Request } from 'express';
import { Permissions, UserRequest, Error } from '../types';
import { fetchUsers } from '../operations/user';
import { userRegisterValidator } from '../validator';
import { unauthorized, unauthenticated, badRequest } from '../utils/responses';
import { getToken, getRequestUser } from '../utils/user';

// Checks the user is authenticated. If not, it will return an error
export const isAuthenticated = () => (request: Request, response: Response, next: NextFunction) => {
  const token = getToken(request);
  if (token) {
    return next();
  }

  return unauthenticated(response);
};

// Checks the user has the given permission. If not, it will return an error
export const hasPermission = (permission: Permission) => (request: Request, response: Response, next: NextFunction) => {
  const user = getRequestUser(response);

  const containsPermission = (userPermissions: string, permission: Permission) => {
    return (
      // User has only this permission
      userPermissions === permission ||
      // Contains this permission (but it is not the last of the list)
      userPermissions.includes(`${permission},`) ||
      // Contains this permission (and it is the last of the list)
      userPermissions.endsWith(`,${permission}`)
    );
  };

  if (user) {
    // If user has required permission or has "admin" permission
    if (containsPermission(user.permissions, permission) || containsPermission(user.permissions, Permission.admin)) {
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
