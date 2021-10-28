import type { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import env from '../../utils/env';
import database from '../../services/database';
import { fetchUser } from '../../operations/user';
import { ActionFeedback, DiscordFeedbackCode } from '../../types';
import { decrypt } from '../../utils/helpers';
import { isLoginAllowed } from '../../middlewares/settings';
import type { DiscordAuthorization } from './discordApi';
import logger from '../../utils/logger';
import { fetchDiscordUser, getToken } from '../../services/discord';
import { removeDiscordRoles } from '../../utils/discord';
import { createLog } from '../../operations/log';

const redirect = (response: Response, statusCode: DiscordFeedbackCode) => {
  response
    .status(302)
    .set({
      Location: `${env.front.website}/dashboard/account?action=${ActionFeedback.DISCORD_OAUTH}&state=${statusCode}`,
    })
    .end();
};

export default [
  isLoginAllowed,
  async (request: Request<{}, {}, {}, DiscordAuthorization>, response: Response) => {
    try {
      const { error, code, state } = request.query;

      // At that point, an error is most likely because the user denied the permission access
      if (typeof error !== 'undefined') return redirect(response, DiscordFeedbackCode.ERR_OAUTH_DENIED);

      // If there is no code with no error, it is probably a bad request !
      if (typeof code !== 'string' || typeof state !== 'string')
        return redirect(response, DiscordFeedbackCode.ERR_BAD_REQUEST);

      // Retrieve user from `state`
      const userId = decrypt(Buffer.from(state, 'base64'));
      const userPromise = fetchUser(userId);

      // Parallelize the request to the Discord API and the Database
      const [discordUserToken, user] = await Promise.all([getToken(code), userPromise]);
      // Attach sentry error log (if an error occurs) to the user
      Sentry.setUser({ id: user.id, username: user.username, email: user.email });

      // State is invalid ! User may have modified it on the fly
      // Or this is not the scope we asked access for => bad request
      // Or we haven't got a bearer token, abort process too
      if (!user || discordUserToken.scope !== 'identify' || discordUserToken.token_type?.toLowerCase() !== 'bearer')
        return redirect(response, DiscordFeedbackCode.ERR_BAD_REQUEST);

      // We now retrieve Authorization information. Contains basic user data containing
      // user id, username, discriminator, avatar url and public flags (ie. public badges)
      const discordUser = await fetchDiscordUser(discordUserToken);

      // If id is not defined, it means the user refused the permission access grant
      if (!discordUser?.id) return redirect(response, DiscordFeedbackCode.ERR_OAUTH_DENIED);

      // Otherwise, we have the id and we can update the database
      const updatedUser = await database.user.update({
        data: { discordId: discordUser.id },
        where: { id: user.id },
      });

      // Add logging callback when the request is successful. This callback will
      // also generate logs for a NOT_MODIFIED result, to check request spamming
      response.on('finish', async () => {
        // Checks if the response was successful (is a 2xx response)
        // (The discord role removal could fail)
        if (Math.floor(response.statusCode / 100) === 2)
          await createLog(request.method, request.originalUrl, user.id, request.body);
      });

      // The user had no linked discord account before the operation ! We're gonna be gentle
      // with him/her and display him/her a feedback for team creation/joining
      if (!user.discordId && updatedUser.discordId) return redirect(response, DiscordFeedbackCode.LINKED_NEW);

      // The id was updated (and was different from the one previously in database)
      if (user.discordId !== updatedUser.discordId) {
        await removeDiscordRoles(user);
        return redirect(response, DiscordFeedbackCode.LINKED_UPDATED);
      }

      // The id has not changed because the same discord account was used
      return redirect(response, DiscordFeedbackCode.NOT_MODIFIED);
    } catch (updateError) {
      if (updateError.code === 'P2002' && updateError.meta && updateError.meta.target === 'users_discordId_key')
        return redirect(response, DiscordFeedbackCode.ERR_ALREADY_LINKED);

      // If the user uses an invalid state the {@link decrypt} function cannot decrypt,
      // this exception will be raised
      if (updateError.code === 'ERR_OSSL_EVP_WRONG_FINAL_BLOCK_LENGTH')
        return redirect(response, DiscordFeedbackCode.ERR_BAD_REQUEST);

      // Unexpected error: log it and redirect the user
      logger.error(updateError);
      Sentry.captureException(updateError);
      return redirect(response, DiscordFeedbackCode.ERR_UNKNOWN);
    }
  },
];
