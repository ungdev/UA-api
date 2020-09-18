import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import { success } from '../utils/responses';

const prisma = new PrismaClient({
  log: ['query'],
});

export default () => async (req: Request, res: Response) => {
  const settings = await prisma.settings.findMany();
  return success(
    res,
    settings.reduce((prev, current) => {
      Object.assign(prev, { [current.id]: current.value });
      return prev;
    }, {}),
  );
};
