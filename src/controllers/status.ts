import { NextFunction, Request, Response } from 'express';
import { fetchSettings } from '../operations/settings';
import { success } from '../utils/responses';

export default [
  async (request: Request, response: Response, next: NextFunction) => {
    // Try to reach the database
    try {
      await fetchSettings();

      return success(response, {
        http: true,
      });
    } catch (error) {
      return next(error);
    }
  },
];
