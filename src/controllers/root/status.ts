import { NextFunction, Request, Response } from 'express';
import { fetchSettings } from '../../operations/settings';
import { success } from '../../utils/responses';
import env from '../../utils/env';

export default [
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      await fetchSettings();

      const documentationUrl = `${env.front.website}${env.api.prefix}${env.api.prefix === '/' ? 'docs' : '/docs'}`;

      return success(response, {
        http: true,
        documentation: documentationUrl,
      });
    } catch (error) {
      return next(error);
    }
  },
];
