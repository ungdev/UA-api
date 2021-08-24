import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { filterUserWithTeam } from '../../../utils/filters';
import { success } from '../../../utils/responses';
import { hasPermission } from '../../../middlewares/authentication';
import { fetchUsers } from '../../../operations/user';
import { Permission, UserSearchQuery } from '../../../types';
import { validateQuery } from '../../../middlewares/validation';
import * as validators from '../../../utils/validators';
import env from '../../../utils/env';

export default [
  // Middlewares
  ...hasPermission(Permission.entry, Permission.anim),
  validateQuery(
    Joi.object({
      username: Joi.string(),
      firstname: validators.firstname,
      lastname: validators.lastname,
      email: Joi.string(), // Only string because it starts with
      place: Joi.string(),
      type: validators.type,
      team: validators.teamName,
      tournament: validators.tournamentId,
      locked: validators.stringBoolean,
      scanned: validators.stringBoolean,
      permission: validators.permission,
      page: Joi.string().default('0'), // must be a string as it is in query
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const userSearch = request.query as UserSearchQuery;

      // Get the page from the params. Default to zero and put it in max to ensure there is no negative numbers
      const page = Math.max(Number.parseInt(request.params.page) || 0, 0);

      const users = await fetchUsers(userSearch, page);
      return success(response, {
        itemsPerPage: env.api.itemsPerPage,
        currentPage: page,
        totalItems: 0,
        totalPages: 0,
        users: users.map(filterUserWithTeam),
      });
    } catch (error) {
      return next(error);
    }
  },
];
