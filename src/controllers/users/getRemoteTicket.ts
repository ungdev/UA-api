import { Request, Response, NextFunction } from 'express';
import { isInATeam } from '../../middlewares/team';
import { fetchUser } from '../../operations/user';
import { forbidden, notFound, success } from '../../utils/responses';
import { getRequestInfo } from '../../utils/users';
import { Error as ResponseError } from '../../types';
import { filterItem } from '../../utils/filters';
import { fetchUserItems } from '../../operations/item';

export const fetchRemoteTicket = [
  ...isInATeam,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const remoteUser = await fetchUser(request.params.userId);
      const { user, team } = getRequestInfo(response);

      // Check if the user exists. Return the same error if the player is not in the same team
      if (!remoteUser || remoteUser.teamId !== user.teamId) return notFound(response, ResponseError.UserNotFound);

      // Check if the user has already paid
      if (remoteUser.hasPaid) return forbidden(response, ResponseError.AlreadyPaid);

      const items = await fetchUserItems(team, remoteUser);
      return success(response, filterItem(items.find((item) => item.id === `ticket-${remoteUser.type}`)));
    } catch (error) {
      return next(error);
    }
  },
];
