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
      userId: Joi.string().optional(),
      search: Joi.string().optional(),
      place: Joi.string().optional(),
      type: validators.type.optional(),
      tournament: validators.tournamentId.optional(),
      locked: validators.stringBoolean.optional(),
      scanned: validators.stringBoolean.optional(),
      permission: validators.permission.optional(),
      page: Joi.number().integer().positive().default('0'),
    }).required(),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const userSearch = request.query as UserSearchQuery;

      // Get the page from the query. Default to zero and put it in max to ensure there is no negative numbers
      const pageNumber = request.query.page as string;
      const page = Number.parseInt(pageNumber);

      // Fetch matching users and database entry count
      const [users, userCount] = await fetchUsers(userSearch, page);

      // Compute page count
      const nbPages = Math.ceil(userCount / env.api.itemsPerPage);

      return success(response, {
        itemsPerPage: env.api.itemsPerPage,
        currentPage: page,
        totalItems: userCount,
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
