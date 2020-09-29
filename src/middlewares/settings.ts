import { Request, Response, NextFunction } from 'express';
import { fetchLogin, fetchShop } from '../operations/settings';
import { Error } from '../types';
import { badRequest } from '../utils/responses';

export const loginAllowed = async (request: Request, response: Response, next: NextFunction) => {
  const login = (await fetchLogin()).value;
  if (login === 'true') {
    return next();
  }
  return badRequest(response, Error.LoginNotAllowed);
};

export const shopAllowed = async (request: Request, response: Response, next: NextFunction) => {
  const shop = (await fetchShop()).value;
  if (shop === 'true') {
    return next();
  }
  return badRequest(response, Error.ShopNotAllowed);
};
