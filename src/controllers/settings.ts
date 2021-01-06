import { Setting } from '@prisma/client';
import { Request, Response } from 'express';

import database from '../utils/database';
import { success } from '../utils/responses';

export default [
  async (request: Request, response: Response) => {
    const settings = await database.setting.findMany();

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
  },
];
