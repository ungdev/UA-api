import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { isCaptain, isTeamNotLocked } from '../../middlewares/team';
import { validateBody } from '../../middlewares/validation';
import { success } from '../../utils/responses';
import { updateTeam } from '../../operations/team';
import { filterTeam } from '../../utils/filters';
import * as validators from '../../utils/validators';

export default [
  // Middlewares
  ...isCaptain,
  isTeamNotLocked,
  validateBody(
    Joi.object({
      name: validators.teamName,
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { name } = request.body;

      const team = await updateTeam(request.params.teamId, name);

      return success(response, filterTeam(team));
    } catch (error) {
      return next(error);
    }
  },
];
