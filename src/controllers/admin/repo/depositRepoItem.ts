import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasPermission } from '../../../middlewares/authentication';
import { fetchUser } from '../../../operations/user';
import { validateBody, validateQuery } from '../../../middlewares/validation';
import { created, methodNotSupported } from '../../../utils/responses';
import { Permission, Error as ResponseError, UserSearchQuery, UserType, RepoItemType } from '../../../types';
import { addRepoItem } from '../../../operations/repo';
import { fetchTeam } from '../../../operations/team';
import nanoid from '../../../utils/nanoid';
import { type } from '../../../utils/validators';

export default [
  // Middlewares
  ...hasPermission(Permission.repo),
  validateQuery(Joi.object({ userId: Joi.string().required() }).required()),
  validateBody(
    Joi.object({
      items: Joi.array()
        .items(Joi.object({ type: Joi.string().required(), zone: Joi.string().required() }).required())
        .required(),
    }).required(),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      let { userId } = request.query as UserSearchQuery & { userId: string };
      const items: { type: RepoItemType; zone: string }[] = request.body.items;

      const user = await fetchUser(userId);
      const team = await fetchTeam(user.teamId);
      if (!user.scannedAt || ((user.type === UserType.player || user.type === UserType.coach) && !team.lockedAt)) {
        return methodNotSupported(response, ResponseError.NotScannedOrLocked);
      }

      await addRepoItem(
        userId,
        items.map((item) => ({ id: nanoid(), type: item.type, forUserId: userId, zone: item.zone })),
      );
      return created(response);
    } catch (error) {
      return next(error);
    }
  },
];
