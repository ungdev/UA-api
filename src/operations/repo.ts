import { RepoItemType, RepoLogAction } from '@prisma/client';
import database from '../services/database';
import { RepoItem, RepoLog } from '../types';
import nanoid from '../utils/nanoid';

export const fetchRepoItems = (userId: string): Promise<RepoItem[]> =>
  database.repoItem.findMany({ where: { forUserId: userId, pickedUp: false } });

export const fetchRepoItem = (itemId: string): Promise<RepoItem> =>
  database.repoItem.findUnique({ where: { id: itemId } });

export const findItemOfType = (userId: string, type: RepoItemType): Promise<RepoItem> =>
  database.repoItem.findFirst({ where: { forUserId: userId, type, pickedUp: false } });

export const addRepoItem = (userId: string, itemType: RepoItemType, itemZone: string) => {
  const id = nanoid();
  return [
    database.repoItem.create({ data: { id, type: itemType, forUserId: userId, zone: itemZone } }),
    database.repoLog.create({
      data: { id: nanoid(), itemId: id, action: RepoLogAction.added, forUserId: userId },
    }),
  ];
};

export const addRepoItems = async (userId: string, items: { itemType: RepoItemType; itemZone: string }[]) => {
  await database.$transaction(items.flatMap((item) => addRepoItem(userId, item.itemType, item.itemZone)));
};

export const setZoneOfItem = async (userId: string, itemId: string, zone: string) => {
  await database.repoItem.update({ where: { id: itemId }, data: { zone } });
  await database.repoLog.create({ data: { id: nanoid(), itemId, action: RepoLogAction.added, forUserId: userId } });
};

export const removeRepoItem = async (itemId: string, userId: string) => {
  await database.repoItem.update({ where: { id: itemId }, data: { pickedUp: true } });
  await database.repoLog.create({
    data: { id: nanoid(), itemId, action: RepoLogAction.removed, forUserId: userId },
  });
};

export const fetchRepoLogs = (userId: string): Promise<RepoLog[]> =>
  database.repoLog.findMany({ where: { forUserId: userId }, include: { item: true } });
