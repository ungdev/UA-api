import { pick } from 'lodash';
import { CartItem, CartWithCartItems, Item, Team, Tournament, User, UserWithTeam } from '../types';

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

export const filterUserWithTeam = (user: UserWithTeam) => {
  const filteredUser = filterUser(user);
  const filteredTeam = user.team ? pick(user.team, ['id', 'name', 'tournamentId', 'captainId', 'lockedAt']) : undefined;

  return {
    ...filteredUser,
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
