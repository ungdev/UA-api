import { Request, Response } from 'express';
import { ObjectType, Setting } from '../types';
import database from '../utils/database';

import { success } from '../utils/responses';

export default async (req: Request, res: Response) => {
  const settings = await database.settings.findMany();
  return success(
    res,
    settings.reduce((prev: ObjectType, current: Setting) => {
      Object.assign(prev, { [current.id]: current.value });
      return prev;
    }, {}),
  );
};
