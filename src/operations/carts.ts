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

export const dropStale = () =>
  database.cart.deleteMany({
    where: {
      createdAt: {
        lt: new Date(Date.now() - env.api.cartLifespan),
      },
      transactionState: 'pending',
    },
  });

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

export const updateCart = (
  cartId: string,
  transactionId: number,
  transactionState: TransactionState,
): Promise<DetailedCart> =>
  database.cart.update({
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

export const refundCart = (cartId: string): Promise<Cart> =>
  database.cart.update({
    data: { transactionState: TransactionState.refunded },
    where: { id: cartId },
  });

export const forcePay = async (user: User) => {
  let itemId: string;

  const items = await fetchUserItems(undefined, user);

  switch (user.type) {
    case UserType.player:
    case UserType.coach:
      itemId = `ticket-${user.type}`;
      break;
    default:
      itemId = `ticket-${UserType.player}`;
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
