import { NextFunction, Request, Response } from 'express';
import { isAuthenticated } from '../../middlewares/authentication';
import { filterUser } from '../../utils/filters';
import { success } from '../../utils/responses';
import { getRequestInfo } from '../../utils/users';
import { fetchOrgaData, formatOrgaData } from "../../operations/user";

export default [
  // Middlewares
  ...isAuthenticated,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { user } = getRequestInfo(response);

      const orgaData = await fetchOrgaData(user.id);

      return success(response, {
        ...filterUser(user),
        orga: formatOrgaData(orgaData),
      });
    } catch (error) {
      return next(error);
    }
  },
];
