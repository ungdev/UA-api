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
      userId: Joi.string(),
      search: Joi.string() || '',
      place: Joi.string(),
      type: validators.type,
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

      // Get the page from the query. Default to zero and put it in max to ensure there is no negative numbers
      const pageNumber = request.query.page as string;
      const page = Math.max(Number.parseInt(pageNumber) || 0, 0);

      // Fetch matching users and database entry count
      const [users, userCount] = await fetchUsers(userSearch, page);

      // Compute page count
      const nbPages = Math.ceil(userCount / env.api.itemsPerPage);

      return success(response, {
        itemsPerPage: env.api.itemsPerPage,
        currentPage: page,
        totalItems: users.length,
        totalPages: nbPages,
        users: users.map((user) => ({
          ...filterUserWithTeam(user),
          customMessage: user.customMessage,
        })),
      });
    } catch (error) {
      return next(error);
    }
  },
];
