import { Request, Response, NextFunction } from 'express';
import { fetchSetting } from '../operations/settings';
import { Error } from '../types';
import { forbidden } from '../utils/responses';

export const isLoginAllowed = async (request: Request, response: Response, next: NextFunction) => {
  const login = (await fetchSetting('login')).value;
  if (login) {
    return next();
  }
  return forbidden(response, Error.LoginNotAllowed);
};

export const isShopAllowed = async (request: Request, response: Response, next: NextFunction) => {
  const shop = (await fetchSetting('shop')).value;
  if (shop) {
    return next();
  }
  return forbidden(response, Error.ShopNotAllowed);
};
