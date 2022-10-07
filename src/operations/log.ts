import { PrismaPromise } from '@prisma/client';
import { Log, LogSearchQuery } from '../types';
import database from '../services/database';
import env from '../utils/env';
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
      where:
        query.teamId || query.userId
          ? {
              OR: {
                userId: query.userId ?? undefined,
                user: { teamId: query.teamId },
              },
            }
          : undefined,
      take: env.api.itemsPerPage,
      skip: query.page * env.api.itemsPerPage,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    database.log.count({
      where:
        query.teamId || query.userId
          ? {
              OR: {
                userId: query.userId ?? undefined,
                user: { teamId: query.teamId },
              },
            }
          : undefined,
    }),
  ]);
