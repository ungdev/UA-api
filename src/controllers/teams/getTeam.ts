import { NextFunction, Request, Response } from 'express';
import { isInATeam } from '../../middlewares/team';
import { forbidden, success } from '../../utils/responses';
import { filterTeam } from '../../utils/filters';
import { getRequestInfo } from '../../utils/user';
import { Error } from '../../types';

export default [
  // Middlewares
  ...isInATeam,

  // Controller
  (request: Request, response: Response, next: NextFunction) => {
    try {
      const { team } = getRequestInfo(response);

      if (!team) {
        return forbidden(response, Error.NotInTeam);
      }

      return success(response, filterTeam(team));
    } catch (error) {
      return next(error);
    }
  },
];
