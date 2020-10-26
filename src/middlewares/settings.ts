import { Request, Response, NextFunction } from 'express';
import { fetchSetting } from '../operations/settings';
import { Error } from '../types';
import { badRequest } from '../utils/responses';

export const loginAllowed = async (request: Request, response: Response, next: NextFunction) => {
  const login = (await fetchSetting('shop')).value;
  if (login) {
    return next();
  }
  return badRequest(response, Error.LoginNotAllowed);
};

export const shopAllowed = async (request: Request, response: Response, next: NextFunction) => {
  const shop = (await fetchSetting('shop')).value;
  if (shop) {
    return next();
  }
  return badRequest(response, Error.ShopNotAllowed);
};
