import { pick } from 'lodash';
import {
  CartItem,
  CartWithCartItems,
  CartWithCartItemsAdmin,
  Item,
  ParsedPermissionsHolder,
  RawUser,
  Team,
  Tournament,
  User,
  UserWithTeamAndTournamentInfo,
} from '../types';

export const filterUserRestricted = (user: User) => pick(user, ['id', 'username', 'type', 'hasPaid']);

export const filterUser = (user: User) =>
  pick(user, [
    'id',
    'type',
    'hasPaid',
    'username',
    'firstname',
    'lastname',
    'age',
    'email',
    'permissions',
    'place',
    'scanned',
    'discordId',
    'teamId',
    'askingTeamId',
    'attendant.firstname',
    'attendant.lastname',
    'attendant.id',
  ]);

export const filterAdminAccount = (user: ParsedPermissionsHolder<RawUser>) =>
  pick(user, ['id', 'type', 'username', 'firstname', 'lastname', 'email', 'permissions']);

export const filterUserWithTeamAndTournamentInfo = (user: UserWithTeamAndTournamentInfo) => {
  const filteredUser = filterUser(user);
  const filteredTeam = user.team
    ? pick(user.team, ['id', 'name', 'captainId', 'lockedAt', 'tournament.id', 'tournament.name'])
    : undefined;

  return {
    ...filteredUser,
    customMessage: user.customMessage,
    team: filteredTeam,
  };
};

export const filterItem = (item: Item) =>
  pick(item, ['id', 'name', 'category', 'attribute', 'price', 'infos', 'image', 'left']);

export const filterCartItem = (cartItem: CartItem) =>
  pick(cartItem, ['id', 'quantity', 'cartId', 'itemId', 'forUser.id', 'forUser.username']);

export const filterCartWithCartItems = (cart: CartWithCartItems) => {
  const filteredCart = pick(cart, ['id', 'userId', 'transactionState', 'transactionId', 'paidAt']);

  return {
    ...filteredCart,
    cartItems: cart.cartItems.map(filterCartItem),
  };
};

export const filterCartItemAdmin = (cartItem: CartItem) =>
  pick(cartItem, ['id', 'quantity', 'cartId', 'item.id', 'item.name', 'forUser.id', 'forUser.username']);

export const filterCartWithCartItemsAdmin = (cart: CartWithCartItemsAdmin) => {
  const filteredCart = pick(cart, ['id', 'userId', 'transactionState', 'transactionId', 'paidAt', 'totalPrice']);

  return {
    ...filteredCart,
    cartItems: cart.cartItems.map(filterCartItemAdmin),
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

export const filterTeamRestricted = (team: Team) => {
  const filteredTeam = pick(team, ['id', 'name', 'tournamentId', 'captainId', 'lockedAt']);

  return {
    ...filteredTeam,
    players: team.players.map(filterUserRestricted),
    coaches: team.coaches.map(filterUserRestricted),
  };
};

export const filterTournamentRestricted = (tournament: Tournament) => {
  const filteredTournament = pick(
    tournament,
    'id',
    'name',
    'shortName',
    'maxPlayers',
    'playersPerTeam',
    'lockedTeamsCount',
    'placesLeft',
  );

  return {
    ...filteredTournament,
    teams: tournament.teams.map(filterTeamRestricted),
  };
};
