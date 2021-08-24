import { NextFunction, Request, Response } from 'express';
import { isInATeam } from '../../middlewares/team';
import { success } from '../../utils/responses';
import { filterTeam } from '../../utils/filters';
import { getRequestInfo } from '../../utils/users';

export default [
  // Middlewares
  ...isInATeam,

  // Controller
  (request: Request, response: Response, next: NextFunction) => {
    try {
      const { team } = getRequestInfo(response);

      return success(response, filterTeam(team));
    } catch (error) {
      return next(error);
    }
  },
];
