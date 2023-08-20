import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { validateBody } from '../../../middlewares/validation';
import { notFound, success } from '../../../utils/responses';
import { Error } from '../../../types';
import { setDisplayTrombi, setLoginAllowed, setShopAllowed } from '../../../operations/settings';

export default [
  // Middlewares
  ...hasPermission(),
  validateBody(
    Joi.object({
      value: Joi.string().required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      let result;
      switch (request.params.setting) {
        case 'login': {
          result = await setLoginAllowed(request.body.value === 'true');
          break;
        }
        case 'shop': {
          result = await setShopAllowed(request.body.value === 'true');
          break;
        }
        case 'trombi': {
          result = await setDisplayTrombi(request.body.value === 'true');
          break;
        }
        default: {
          return notFound(response, Error.NotFound);
        }
      }

      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
