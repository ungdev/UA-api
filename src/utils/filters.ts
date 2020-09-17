import _ from 'lodash';
import UserModel from '../models/user';

export const filterUserRestricted = (user: UserModel): Partial<UserModel> => _.pick(user, ['id', 'type', 'hasPaid']);

export const filterUser = (user: UserModel): Partial<UserModel> =>
  _.pick(user, [
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
