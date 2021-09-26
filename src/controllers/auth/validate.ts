import { Request, Response } from 'express';
import { isNotAuthenticated } from '../../middlewares/authentication';
import { fetchUser, removeUserRegisterToken } from '../../operations/user';
import { ActionFeedback } from '../../types';
import env from '../../utils/env';
import { redirect } from '../../utils/responses';

export default [
  // Middlewares
  ...isNotAuthenticated,

  // Controller
  async (request: Request, response: Response) => {
    try {
      const { token } = request.params;

      // find corresponding user
      const user = await fetchUser(token, 'registerToken');

      // if no user has the registerToken, we send an error
      if (!user) return redirect(response, `${env.front.website}/?action=${ActionFeedback.VALIDATE}&state=1`);

      // Otherwise we delete the registerToken and send a success status to the client
      await removeUserRegisterToken(user.id);

      return redirect(response, `${env.front.website}/?action=${ActionFeedback.VALIDATE}&state=0`);
    } catch {
      // An unknown error occurred. We redirect the client to an error state.
      return redirect(response, `${env.front.website}/?action=${ActionFeedback.VALIDATE}&state=2`);
    }
  },
];
