import { RepoLogAction } from '@prisma/client';
import database from '../services/database';
import { RepoItem, RepoLog } from '../types';
import nanoid from '../utils/nanoid';

export const fetchRepoItems = (userId: string): Promise<RepoItem[]> => {
  return database.repoItem.findMany({ where: { forUserId: userId } });
};

export const fetchRepoItem = (itemId: string): Promise<RepoItem> => {
  return database.repoItem.findUnique({ where: { id: itemId } });
};

export const addRepoItem = async (userId: string, items: RepoItem[]) => {
  await database.repoItem.createMany({ data: items });
  await database.repoLog.createMany({
    data: items.map((item) => ({ id: nanoid(), itemId: item.id, action: RepoLogAction.added, forUserId: userId })),
  });
};

export const removeRepoItem = async (itemId: string, userId: string) => {
  await database.repoItem.delete({ where: { id: itemId } });
  await database.repoLog.create({
    data: { id: nanoid(), itemId: itemId, action: RepoLogAction.removed, forUserId: userId },
  });
};

export const fetchRepoLogs = (userId: string, itemId: string): Promise<RepoLog[]> => {
  return database.repoLog.findMany({ where: { forUserId: userId, itemId } });
};
