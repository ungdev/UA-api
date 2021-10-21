import prisma, { TransactionState, UserType } from '@prisma/client';

import database from '../services/database';
import { Cart, CartWithCartItems, CartWithCartItemsAdmin, DetailedCart, PrimitiveCartItem } from '../types';
import env from '../utils/env';
import nanoid from '../utils/nanoid';

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

export const forcePay = (user: prisma.User) => {
  let itemId;

  switch (user.type) {
    case UserType.player:
    case UserType.coach:
    case UserType.spectator:
      itemId = `ticket-${user.type}`;
      break;
    default: {
      throw new Error(`Can't pay for ${user.type}`);
    }
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
            quantity: 1,
            forUserId: user.id,
          },
        ],
      },
    },
  });
};
