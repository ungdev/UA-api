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
      username: Joi.string().optional(),
      name: Joi.string().optional(),
      email: Joi.string().optional(),
      place: Joi.string().optional(),
      type: validators.type.optional(),
      team: validators.teamName.optional(),
      tournament: validators.tournamentId.optional(),
      locked: validators.stringBoolean.optional(),
      scanned: validators.stringBoolean.optional(),
      permission: validators.permission.optional(),
      page: Joi.string().default('0').optional(), // must be a string as it is in query
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const userSearch = request.query as UserSearchQuery;

      // Get the page fromt the params. Default to zero and put it in max to ensure there is no negative numbers
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
