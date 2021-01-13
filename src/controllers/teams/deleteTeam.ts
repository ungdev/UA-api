import { NextFunction, Request, Response } from 'express';
import { isCaptain } from '../../middlewares/parameters';
import { noContent } from '../../utils/responses';
import { deleteTeam } from '../../operations/team';

export default [
  // Middlewares
  ...isCaptain,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      await deleteTeam(request.params.teamId);

      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
