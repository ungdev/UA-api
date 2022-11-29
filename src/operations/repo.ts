import { RepoItemType, RepoLogAction } from '@prisma/client';
import database from '../services/database';
import { RepoItem, RepoLog } from '../types';
import nanoid from '../utils/nanoid';

export const fetchRepoItems = (userId: string): Promise<RepoItem[]> => {
  return database.repoItem.findMany({ where: { forUserId: userId } });
};

export const fetchRepoItem = (itemId: string): Promise<RepoItem> => {
  return database.repoItem.findUnique({ where: { id: itemId } });
};

export const findPC = (userId: string): Promise<RepoItem> => {
  return database.repoItem.findFirst({ where: { forUserId: userId, type: 'computer', zone: { not: null } } });
};

export const addRepoItems = async (userId: string, items: { itemType: RepoItemType; itemZone: string }[]) => {
  await Promise.all(items.map((item) => addRepoItem(userId, item.itemType, item.itemZone)));
};

export const addRepoItem = async (userId: string, itemType: RepoItemType, itemZone: string) => {
  const existingItem = await database.repoItem.findFirst({
    where: { forUserId: userId, zone: null, type: itemType },
  });
  let id = existingItem?.id;
  if (existingItem) {
    await database.repoItem.update({ where: { id: existingItem.id }, data: { zone: itemZone } });
  } else {
    id = nanoid();
    await database.repoItem.create({ data: { id, type: itemType, forUserId: userId, zone: itemZone } });
  }
  await database.repoLog.create({
    data: { id: nanoid(), itemId: id, action: RepoLogAction.added, forUserId: userId },
  });
};

export const setZoneOfItem = async (userId: string, itemId: string, zone: string) => {
  await database.repoItem.update({ where: { id: itemId }, data: { zone } });
  await database.repoLog.create({ data: { id: nanoid(), itemId, action: RepoLogAction.added, forUserId: userId } });
};

export const removeRepoItem = async (itemId: string, userId: string) => {
  await database.repoItem.update({ where: { id: itemId }, data: { zone: null } });
  await database.repoLog.create({
    data: { id: nanoid(), itemId, action: RepoLogAction.removed, forUserId: userId },
  });
};

export const fetchRepoLogs = (userId: string): Promise<RepoLog[]> => {
  return database.repoLog.findMany({ where: { forUserId: userId }, include: { item: true } });
};
