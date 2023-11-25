import Joi from 'joi';
import { NextFunction, Request, Response } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission, Error, UserPatchBody } from '../../../types';
import { badRequest, conflict, forbidden, notFound, success } from "../../../utils/responses";
import { fetchOrga, fetchOrgaData, fetchUser, filterOrgaData, updateAdminUser } from '../../../operations/user';
import { filterUser } from '../../../utils/filters';
import { validateBody } from '../../../middlewares/validation';
import * as validators from '../../../utils/validators';
import { removeDiscordRoles } from '../../../utils/discord';
import { getRequestInfo } from '../../../utils/users';
import { fetchCommissions } from '../../../operations/commission';

export default [
  // Middlewares
  ...hasPermission(Permission.anim),
  validateBody(
    Joi.object({
      type: validators.type.optional(),
      age: validators.age.optional(),
      permissions: Joi.array().optional().items(validators.permission),
      place: validators.place.allow(null).optional(),
      discordId: validators.discordId.allow(null).optional(),
      customMessage: Joi.string().allow(null).optional(),
      username: validators.username.optional(),
      lastname: validators.lastname.optional(),
      firstname: validators.firstname.optional(),
      email: validators.email.optional(),
      orgaRoles: Joi.array()
        .items(
          Joi.object({
            commissionRole: Joi.string().allow('respo', 'member'),
            commission: Joi.string(),
          }),
        )
        .optional(),
      orgaMainCommission: Joi.string().optional(),
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

      const {
        type,
        place,
        permissions,
        discordId,
        customMessage,
        age,
        email,
        username,
        firstname,
        lastname,
        orgaRoles,
        orgaMainCommission,
      } = request.body as UserPatchBody;

      // Check that every commission of the user does exist
      const commissions = await fetchCommissions();
      if (
        orgaRoles &&
        !orgaRoles.every((orgaRole) => commissions.some((commission) => orgaRole.commission === commission.id))
      ) {
        return notFound(response, Error.CommissionNotFound);
      }

      // Check that the user type hasn't changed if the user is paid
      if (type && user.hasPaid && user.type !== type) {
        return forbidden(response, Error.CannotChangeType);
      }

      // Check that permissions are not in the request body or that the initiator
      // is admin
      const initiator = getRequestInfo(response).user;
      if (permissions && !initiator.permissions.includes(Permission.admin)) {
        return forbidden(response, Error.NoPermission);
      }

      // Check that the main commission of the user is a commission of this user
      const orga = await fetchOrga(user);
      if (
        orgaMainCommission &&
        !(orgaRoles
          ? orgaRoles.find((role) => role.commission === orgaMainCommission)
          : orga.roles.find((role) => role.commission.id === orgaMainCommission))
      ) {
        return forbidden(response, Error.UserDoesntHaveMainCommission);
      }

      // Check that we are not removing the main commission of the user
      // At this point, we know that if orgaMainCommission is not undefined, the state will be correct
      if (orgaRoles && orga.mainCommission && !orgaRoles.some((role) => role.commission === orga.mainCommission)) {
        return forbidden(response, Error.TryingToRemoveMainCommission);
      }

      const updatedUser = await updateAdminUser(user, {
        type,
        permissions,
        place,
        discordId,
        customMessage,
        age,
        email,
        username,
        firstname,
        lastname,
        orgaRoles,
        orgaMainCommission,
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

      return success(response, {
        data: {
          ...filterUser(updatedUser),
          orga: filterOrgaData(await fetchOrgaData(updatedUser.id)),
        },
        customMessage: updatedUser.customMessage,
      });
    } catch (error) {
      if (error.code === 'P2002' && error.meta) {
        // eslint-disable-next-line default-case
        switch (error.meta.target) {
          case 'users_place_key': {
            return conflict(response, Error.PlaceAlreadyAttributed);
          }
          case 'users_discordId_key': {
            return conflict(response, Error.DiscordAccountAlreadyUsed);
          }
          case 'users_email_key': {
            return conflict(response, Error.EmailAlreadyExists);
          }
          case 'users_username_key': {
            return conflict(response, Error.UsernameAlreadyExists);
          }
        }
      }

      return next(error);
    }
  },
];
