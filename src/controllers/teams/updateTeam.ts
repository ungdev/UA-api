import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { isCaptain } from '../../middlewares/team';
import { validateBody } from '../../middlewares/validation';
import { conflict, success } from '../../utils/responses';
import { updateTeam } from '../../operations/team';
import { filterTeam } from '../../utils/filters';
import * as validators from '../../utils/validators';
import { getRequestInfo } from '../../utils/users';
import { Error } from '../../types';

export default [
  // Middlewares
  ...isCaptain,
  validateBody(
    Joi.object({
      name: validators.teamName.required(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { name } = request.body;
      const { team } = getRequestInfo(response);

      const updatedTeam = await updateTeam(team.id, name);
      return success(response, filterTeam(updatedTeam));
    } catch (error) {
      // If a team with this name already exists for this tournament in the database, throw a bad request
      if (error.code === 'P2002' && error.meta && error.meta.target === 'teams_name_tournamentId_key')
        return conflict(response, Error.TeamAlreadyExists);
      return next(error);
    }
  },
];
