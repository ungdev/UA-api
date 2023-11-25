import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { validateBody } from '../../../middlewares/validation';
import { notFound, success } from '../../../utils/responses';
import { Error, Permission } from '../../../types';
import { setTrombiAllowed, setLoginAllowed, setShopAllowed } from '../../../operations/settings';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),
  validateBody(
    Joi.object({
      value: Joi.boolean().required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      let result;
      switch (request.params.setting) {
        case 'login': {
          result = await setLoginAllowed(request.body.value);
          break;
        }
        case 'shop': {
          result = await setShopAllowed(request.body.value);
          break;
        }
        case 'trombi': {
          result = await setTrombiAllowed(request.body.value);
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
