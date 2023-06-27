import {
  TransactionState,
  UserType,
  Cart,
  CartWithCartItems,
  CartWithCartItemsAdmin,
  DetailedCart,
  PrimitiveCartItem,
  User,
} from '../types';

import database from '../services/database';
import env from '../utils/env';
import nanoid from '../utils/nanoid';
import { fetchUserItems } from './item';
import { fetchTeam, lockTeam, unlockTeam } from './team';

export const dropStale = () =>
  database.$transaction([
    database.user.deleteMany({
      where: {
        type: UserType.attendant,
        cartItems: {
          some: {
            cart: {
              transactionState: TransactionState.pending,
              createdAt: {
                lt: new Date(Date.now() - env.api.cartLifespan),
              },
            },
          },
        },
      },
    }),
    database.cart.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - env.api.cartLifespan),
        },
        transactionState: 'pending',
      },
    }),
  ]);

export const fetchCart = (cartId: string): Promise<Cart> =>
  database.cart.findUnique({
    where: {
      id: cartId,
    },
  });

/**
 * Retrieves all carts created by a {@link prisma.User}
 * @param userId the id of the user to fetch the carts of
 * @param includeItem whether the result should include the {@link prisma.Item} in the {@link prisma.CartItem}
 */
export function fetchCarts(userId: string, includeItem: true): Promise<CartWithCartItemsAdmin[]>;
export function fetchCarts(userId: string, includeItem?: false): Promise<CartWithCartItems[]>;
export function fetchCarts(
  userId: string,
  includeItem = false,
): Promise<CartWithCartItems[] | CartWithCartItemsAdmin[]> {
  return database.cart.findMany({
    where: {
      userId,
    },
    include: {
      cartItems: {
        include: {
          forUser: true,
          item: includeItem,
        },
      },
    },
  });
}

export const createCart = (userId: string, cartItems: PrimitiveCartItem[]) =>
  database.cart.create({
    data: {
      id: nanoid(),
      user: {
        connect: {
          id: userId,
        },
      },
      transactionState: TransactionState.pending,
      cartItems: {
        create: cartItems.map((cartItem) => ({
          id: nanoid(),
          item: {
            connect: {
              id: cartItem.itemId,
            },
          },
          quantity: cartItem.quantity,
          price: cartItem.price,
          reducedPrice: cartItem.reducedPrice,
          forUser: {
            connect: {
              id: cartItem.forUserId,
            },
          },
        })),
      },
    },
  });

export const updateCart = async (
  cartId: string,
  transactionId: number,
  transactionState: TransactionState,
): Promise<DetailedCart> => {
  const cart = await database.cart.update({
    data: {
      transactionState,
      paidAt: new Date(),
      transactionId,
    },
    where: {
      id: cartId,
    },
    include: {
      user: true,
      cartItems: {
        include: {
          item: true,
          forUser: true,
        },
      },
    },
  });

  // Lock the team if all the players have paid
  // First, verify the cart is now paid
  if (cart.transactionState !== TransactionState.paid) {
    return cart;
  }
  // Fetch player tickets from the cart
  const playerTickets = cart.cartItems.filter((cartItem) => cartItem.item.name === 'ticket-player');
  for (const ticket of playerTickets) {
    // If the user is not in a team, skip
    if (!ticket.forUser.teamId) {
      continue;
    }
    // Verify every player paid in the team
    const team = await fetchTeam(ticket.forUser.teamId);
    if (team.players.every((player) => player.hasPaid)) {
      await lockTeam(team.id);
    }
  }
  return cart;
};

export const refundCart = async (cartId: string): Promise<Cart> => {
  const cart = await database.cart.update({
    data: { transactionState: TransactionState.refunded },
    where: { id: cartId },
    include: { cartItems: { include: { item: true, forUser: { include: { team: true } } } } },
  });

  // Unlock the teams of the players whose tickets were refunded
  const playerTickets = cart.cartItems.filter((cartItem) => cartItem.item.name === 'ticket-player');
  for (const ticket of playerTickets) {
    if (ticket.forUser.team) {
      await unlockTeam(ticket.forUser.team.id);
    }
  }
  return cart;
};

export const forcePay = async (user: User) => {
  let itemId: string;

  // Fetch user team (if in a team)
  const team = user.teamId ? await fetchTeam(user.teamId) : undefined;

  const items = await fetchUserItems(team, user);

  switch (user.type) {
    case UserType.player:
    case UserType.coach:
    case UserType.spectator: {
      itemId = `ticket-${user.type}`;
      break;
    }
    default: {
      itemId = `ticket-${UserType.spectator}`;
    }
  }

  // Verify the user is a player, that he has a team, and that every player in the team has paid
  // (except for this one, but we know it's going to be paid just after this)
  if (
    user.type === UserType.player &&
    team &&
    team.players.every((player) => player.id === user.id || player.hasPaid)
  ) {
    await lockTeam(team.id);
  }

  return database.cart.create({
    data: {
      id: nanoid(),
      transactionState: TransactionState.paid,
      paidAt: new Date(),
      user: {
        connect: { id: user.id },
      },
      cartItems: {
        create: [
          {
            id: nanoid(),
            itemId,
            price: items.find((item) => item.id === itemId).price,
            reducedPrice: items.find((item) => item.id === itemId).reducedPrice,
            forcePaid: true,
            quantity: 1,
            forUserId: user.id,
          },
        ],
      },
    },
  });
};
