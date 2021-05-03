import { Team, User } from '../types';

export const getCaptain = (team: Team): User => team.players.find((player) => player.id === team.captainId);
