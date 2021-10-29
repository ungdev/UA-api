import Joi from 'joi';
import { NextFunction, Request, Response } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission, Error, UserPatchBody } from '../../../types';
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
      permissions: Joi.array().optional().items(validators.permission),
      place: validators.place.allow(null).optional(),
      discordId: validators.discordId.allow(null).optional(),
      customMessage: Joi.string().allow(null).optional(),
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

      const { type, place, permissions, discordId, customMessage, age } = request.body as UserPatchBody;

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

      // Discard current team/tournament roles if the discordId has been updated
      // This should also be done if the user type has been modified from a team
      // related UserType (ie. player or coach) to an absolute one (ie. spectator
      // or attendant - because the attendant is not represented as belonging to
      // a team)
      if (
        updatedUser.discordId !== user.discordId ||
        ((updatedUser.type === 'spectator' || updatedUser.type === 'attendant') &&
          (user.type === 'player' || user.type === 'coach'))
      )
        await removeDiscordRoles(user);

      return success(response, { ...filterUser(updatedUser), customMessage: updatedUser.customMessage });
    } catch (error) {
      if (error.code === 'P2002' && error.meta && error.meta.target === 'users_place_key')
        return conflict(response, Error.PlaceAlreadyAttributed);

      return next(error);
    }
  },
];
