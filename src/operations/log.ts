import { PrismaPromise } from '.prisma/client';
import { Log } from '../types';
import database from '../services/database';
import { LogSearchQuery } from '../types';
import nanoid from '../utils/nanoid';

export const createLog = (
  method: string,
  path: string,
  userId: string,
  body: object | undefined,
): PrismaPromise<Log> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeBody: any = {};

  // Remove all the values of the keys containing the word password to avoid logging plain text passwords
  if (body)
    for (const [key, value] of Object.entries(body))
      safeBody[key] = !key.toLowerCase().includes('password') ? value : '***';

  return database.log.create({
    data: {
      id: nanoid(),
      method,
      path,
      body: safeBody,
      user: { connect: { id: userId } },
    },
  });
};

export const fetchLogs = (query: LogSearchQuery) =>
  database.$transaction([
    database.log.findMany({
      where: {
        OR: { userId: query.userId ?? undefined, user: query.teamId === null ? undefined : { teamId: query.teamId } },
      },
      take: 100,
      skip: query.page * 100,
    }),
    database.log.count({
      where: {
        OR: { userId: query.userId ?? undefined, user: query.teamId === null ? undefined : { teamId: query.teamId } },
      },
    }),
  ]);
