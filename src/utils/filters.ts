import { pick } from 'lodash';
import { CartItem, CartWithCartItems, Item, Team, Tournament, User } from '../types';

export const filterUserRestricted = (user: User) => pick(user, ['id', 'type']);

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

export const filterItem = (item: Item) =>
  pick(item, ['id', 'name', 'category', 'attribute', 'price', 'infos', 'image']);

export const filterCartItem = (cartItem: CartItem) =>
  pick(cartItem, ['id', 'quantity', 'cartId', 'itemId', 'forUserId']);

export const filterCartWithCartItems = (cart: CartWithCartItems) => {
  const filteredCart = pick(cart, ['id', 'userId', 'transactionState', 'transactionId', 'paidAt']);

  return {
    ...filteredCart,
    cartItems: cart.cartItems.map(filterCartItem),
  };
};

export const filterTournament = (tournament: Tournament) =>
  pick(tournament, 'id', 'name', 'shortName', 'maxPlayers', 'playersPerTeam', 'lockedTeamsCount');

export const filterTeam = (team: Team) => {
  const filteredTeam = pick(team, ['id', 'name', 'tournamentId', 'captainId', 'lockedAt']);

  return {
    ...filteredTeam,
    players: team.players.map(filterUser),
    coaches: team.coaches.map(filterUser),
    askingUsers: team.askingUsers.map(filterUser),
  };
};

export const filterTeamPublic = (team: Team) => {
  const filteredTeam = pick(team, ['id', 'name', 'tournamentId', 'captainId', 'lockedAt']);

  return {
    ...filteredTeam,
    players: team.players.map(filterUser),
    coaches: team.coaches.map(filterUser),
  };
};
