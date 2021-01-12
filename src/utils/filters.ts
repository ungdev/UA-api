import { pick } from 'lodash';
import { Item, Team, User } from '../types';

export const filterUserRestricted = (user: User) => {
  return pick(user, ['id', 'type']);
};

export const filterUser = (user: User) =>
  pick(user, [
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

export const filterItem = (item: Item) => {
  return pick(item, ['id', 'name', 'category', 'attribute', 'price', 'infos', 'image']);
};

export const filterTeam = (team: Team) => {
  const filteredTeam = pick(team, ['id', 'name', 'tournamentId', 'captainId', 'lockedAt']);

  return {
    ...filteredTeam,
    users: team.users.map(filterUser),
    askingUsers: team.askingUsers.map(filterUser),
  };
};
