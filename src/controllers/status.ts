import path from 'path';
import { NextFunction, Request, Response } from 'express';
import { fetchSettings } from '../operations/settings';
import { success } from '../utils/responses';
import env from '../utils/env';

export default [
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      await fetchSettings();

      return success(response, {
        http: true,
        docs: path.join(env.front.website, env.api.prefix, 'docs'),
      });
    } catch (error) {
      return next(error);
    }
  },
];
