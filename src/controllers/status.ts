import { Request, Response } from 'express';

import { success } from '../utils/responses';
import db from '../../server';

export default async (req: Request, res: Response) => {
  const settings = await db.settings.findMany();
  return success(
    res,
    settings.reduce((prev, current) => {
      Object.assign(prev, { [current.id]: current.value });
      return prev;
    }, {}),
  );
};
