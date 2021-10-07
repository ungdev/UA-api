import { Request, Response } from 'express';
import { isAuthenticated } from '../../middlewares/authentication';
import { filterUser } from '../../utils/filters';
import { success } from '../../utils/responses';
import { getRequestInfo } from '../../utils/users';

export default [
  // Middlewares
  ...isAuthenticated,

  // Controller
  (request: Request, response: Response) => {
    const { user } = getRequestInfo(response);

    return success(response, filterUser(user));
  },
];
