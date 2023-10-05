import { Request, Response, NextFunction } from 'express';
import { fetchSetting } from '../operations/settings';
import { Error } from '../types';
import { forbidden } from '../utils/responses';
import { getRequestInfo } from '../utils/users';

export const isLoginAllowed = async (request: Request, response: Response, next: NextFunction) => {
  const login = (await fetchSetting('login')).value;
  const { user } = getRequestInfo(response);

  // If login is allowed or if the user is logged in as an orga account or if the user is on the login page
  if (
    login ||
    (user && user.permissions && user.permissions.length > 0) ||
    request.originalUrl === '/admin/auth/login' ||
    request.route.path === '/admin/auth/login'
  ) {
    return next();
  }
  /* eslint-disable no-console */
  console.error('------chaussette');
  /* eslint-disable no-console */
  console.error(request.originalUrl);
  /* eslint-disable no-console */
  console.error(request.route.path);
  console.error('------chaussette');
  return forbidden(response, Error.LoginNotAllowed);
};

export const isShopAllowed = async (request: Request, response: Response, next: NextFunction) => {
  const shop = (await fetchSetting('shop')).value;
  if (shop) {
    return next();
  }
  return forbidden(response, Error.ShopNotAllowed);
};
