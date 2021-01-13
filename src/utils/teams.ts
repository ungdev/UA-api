import { Team, User } from '../types';

export const getCaptain = (team: Team): User => team.users.find((user) => user.id === team.captainId);
