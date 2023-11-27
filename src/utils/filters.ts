import { pick } from 'lodash';
import { Partner } from '@prisma/client';
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
    'scannedAt',
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

export const filterAdminItem = (item: Item) =>
  pick(item, [
    'id',
    'name',
    'category',
    'attribute',
    'price',
    'reducedPrice',
    'infos',
    'image',
    'left',
    'stock',
    'availableFrom',
    'availableUntil',
  ]);

export const filterItem = (item: Item) =>
  pick(item, [
    'id',
    'name',
    'category',
    'attribute',
    'price',
    'reducedPrice',
    'infos',
    'image',
    'left',
    'availableFrom',
    'availableUntil',
  ]);

export const filterCartItem = (cartItem: CartItem) =>
  pick(cartItem, [
    'id',
    'quantity',
    'price',
    'reducedPrice',
    'cartId',
    'itemId',
    'forcePaid',
    'forUser.id',
    'forUser.username',
  ]);

export const filterCartWithCartItems = (cart: CartWithCartItems) => {
  const filteredCart = pick(cart, ['id', 'userId', 'transactionState', 'transactionId', 'paidAt']);

  return {
    ...filteredCart,
    cartItems: cart.cartItems.map(filterCartItem),
  };
};

export const filterCartItemAdmin = (cartItem: CartItem) =>
  pick(cartItem, [
    'id',
    'quantity',
    'price',
    'reducedPrice',
    'cartId',
    'item.id',
    'item.name',
    'forcePaid',
    'forUser.id',
    'forUser.username',
  ]);

export const filterCartWithCartItemsAdmin = (cart: CartWithCartItemsAdmin) => {
  const filteredCart = pick(cart, ['id', 'userId', 'transactionState', 'transactionId', 'paidAt', 'totalPrice']);

  return {
    ...filteredCart,
    cartItems: cart.cartItems.map(filterCartItemAdmin),
  };
};

export const filterTournament = (tournament: Tournament) =>
  pick(tournament, 'id', 'name', 'maxPlayers', 'playersPerTeam', 'coachesPerTeam', 'lockedTeamsCount');

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
  const filteredTeam = pick(team, ['id', 'name', 'tournamentId', 'captainId', 'lockedAt', "positionInQueue"]);

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
    'maxPlayers',
    'playersPerTeam',
    'coachesPerTeam',
    'lockedTeamsCount',
    'placesLeft',
    'casters',
    'cashprize',
    'cashprizeDetails',
    'format',
    'infos',
  );

  return {
    ...filteredTournament,
    teams: tournament.teams.map(filterTeamRestricted),
  };
};

export const filterPartnerRestricted = (partner: Partner) => pick(partner, 'id', 'name', 'link');
