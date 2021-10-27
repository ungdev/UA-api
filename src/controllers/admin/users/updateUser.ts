import Joi from 'joi';
import { NextFunction, Request, Response } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission, Error } from '../../../types';
import { conflict, forbidden, notFound, success } from '../../../utils/responses';
import { fetchUser, updateAdminUser } from '../../../operations/user';
import { filterUser } from '../../../utils/filters';
import { validateBody } from '../../../middlewares/validation';
import * as validators from '../../../utils/validators';
import { removeDiscordRoles } from '../../../utils/discord';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),
  validateBody(
    Joi.object({
      type: validators.type.optional(),
      age: validators.age.optional(),
      permissions: Joi.array().optional().items(validators.permission.optional()),
      place: validators.place.optional(),
      discordId: validators.discordId.optional(),
      customMessage: Joi.string().optional(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await fetchUser(request.params.userId);

      // Check if the user exists
      if (!user) {
        return notFound(response, Error.UserNotFound);
      }

      const { type, place, permissions, discordId, customMessage, age } = request.body;

      // Check that the user type hasn't changed if the user is paid
      if (type && user.hasPaid && user.type !== type) {
        return forbidden(response, Error.CannotChangeType);
      }

      const updatedUser = await updateAdminUser(user.id, {
        type,
        permissions,
        place,
        discordId,
        customMessage,
        age,
      });

      if (
        updatedUser.discordId !== user.discordId ||
        (updatedUser.type !== user.type &&
          (updatedUser.type === 'spectator' || updatedUser.type === 'attendant') &&
          (user.type === 'player' || user.type === 'coach'))
      )
        await removeDiscordRoles(updatedUser);

      return success(response, { ...filterUser(updatedUser), customMessage: updatedUser.customMessage });
    } catch (error) {
      if (error.code === 'P2002' && error.meta && error.meta.target === 'users_place_key')
        return conflict(response, Error.PlaceAlreadyAttributed);

      return next(error);
    }
  },
];
