import { NextFunction, Request, Response } from 'express';
import { isCaptain, isTeamNotLocked } from '../../middlewares/team';
import { noContent } from '../../utils/responses';
import { deleteTeam } from '../../operations/team';
import { getRequestInfo } from '../../utils/users';

export default [
  // Middlewares
  ...isCaptain,
  isTeamNotLocked,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { team } = getRequestInfo(response);

      await deleteTeam(team.id);

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
