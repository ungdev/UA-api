import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { filterUserWithTeamAndTournamentInfo } from '../../../utils/filters';
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
      tournament: Joi.string().optional(),
      locked: validators.stringBoolean.optional(),
      payment: validators.stringBoolean.optional(),
      scan: validators.stringBoolean.optional(),
      permission: validators.permission.optional(),
      page: Joi.number().integer().min(0).default('0'),
    }).required(),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const userSearch = request.query as UserSearchQuery & { page?: string };

      // Get the page from the query. Default to zero
      const pageNumber = userSearch.page;
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
        users: users.map(filterUserWithTeamAndTournamentInfo),
      });
    } catch (error) {
      return next(error);
    }
  },
];
