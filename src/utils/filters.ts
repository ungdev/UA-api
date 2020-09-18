import { User } from '../types';

export const filterUserRestricted = (user: User): Partial<User> => {
  const {
    id,
    type,
    // hasPaid
  } = user;
  return { id, type };
};

export const filterUser = (user: User): Partial<User> => {
  const {
    id,
    type,
    // hasPaid,
    username,
    firstname,
    lastname,
    email,
    permissions,
    place,
    scannedAt,
    discordId,
    teamId,
    askingTeamId,
  } = user;
  return {
    id,
    type,
    // hasPaid,
    username,
    firstname,
    lastname,
    email,
    permissions,
    place,
    scannedAt,
    discordId,
    teamId,
    askingTeamId,
  };
};
