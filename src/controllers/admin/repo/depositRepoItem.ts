import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasPermission } from '../../../middlewares/authentication';
import { fetchUser } from '../../../operations/user';
import { created, methodNotSupported, notFound } from '../../../utils/responses';
import { Permission, Error as ResponseError, UserType, RepoItemType } from '../../../types';
import { addRepoItems, findItemOfType } from '../../../operations/repo';
import { fetchTeam } from '../../../operations/team';
import { validateBody } from '../../../middlewares/validation';

export default [
  // Middlewares
  ...hasPermission(Permission.repo),
  validateBody(
    Joi.object({
      items: Joi.array()
        .items(
          Joi.object({
            type: Joi.valid(...Object.keys(RepoItemType)).required(),
            zone: Joi.string().required(),
          }),
        )
        .required(),
    }).required(),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { userId } = request.params;
      const { items }: { items: { type: RepoItemType; zone: string }[] } = request.body;

      const user = await fetchUser(userId);
      if (!user) {
        return notFound(response, ResponseError.UserNotFound);
      }
      if (!user.scannedAt) {
        return methodNotSupported(response, ResponseError.NotScannedOrLocked);
      }

      if (user.type === UserType.player || user.type === UserType.coach) {
        if (!user.teamId) {
          return methodNotSupported(response, ResponseError.NotScannedOrLocked);
        }
        const team = await fetchTeam(user.teamId);
        if (!team?.lockedAt) {
          return methodNotSupported(response, ResponseError.NotScannedOrLocked);
        }
      } else {
        return methodNotSupported(response, ResponseError.OnlyPlayersAllowed);
      }

      const isStoringPC = !!(await findItemOfType(user.id, RepoItemType.computer));
      if ((isStoringPC ? 1 : 0) + items.filter((item) => item.type === RepoItemType.computer).length > 1) {
        return methodNotSupported(response, ResponseError.AlreadyHaveComputer);
      }

      await addRepoItems(
        userId,
        items.map((item) => ({ itemType: item.type, itemZone: item.zone })),
      );
      return created(response);
    } catch (error) {
      return next(error);
    }
  },
];
