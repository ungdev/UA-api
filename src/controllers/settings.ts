import { NextFunction, Request, Response } from 'express';
import { fetchSettings } from '../operations/settings';

import { Setting } from '../types';
import { success } from '../utils/responses';

export default [
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const settings = await fetchSettings();

      return success(
        response,
        // Transform [{ id: "x", value: true }] to { x: true }
        settings.reduce(
          (previous: object, current: Setting) => ({
            ...previous,
            [current.id]: current.value,
          }),
          {},
        ),
      );
    } catch (error) {
      return next(error);
    }
  },
];
