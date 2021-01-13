import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { isCaptain } from '../../middlewares/parameters';
import validateBody from '../../middlewares/validateBody';
import { success } from '../../utils/responses';
import { updateTeam } from '../../operations/team';
import { filterTeam } from '../../utils/filters';

export default [
  // Middlewares
  validateBody(
    Joi.object({
      name: Joi.string().required(),
    }),
  ),

  isCaptain(),

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