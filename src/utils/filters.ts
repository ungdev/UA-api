import { Item, User } from '@prisma/client';
import { pick } from 'lodash';

export const filterUserRestricted = (user: User): Partial<User> => {
  return pick(user, ['id', 'type']);
};

export const filterUser = (user: User): Partial<User> => {
  return pick(user, [
    'id',
    'type',
    'hasPaid',
    'username',
    'firstname',
    'lastname',
    'email',
    'permissions',
    'place',
    'scanned',
    'discordId',
    'teamId',
    'askingTeamId',
  ]);
};

export const filterItem = (item: Item): Partial<Item> => {
  return pick(item, ['id', 'name', 'category', 'attribute', 'price', 'infos', 'image']);
};
