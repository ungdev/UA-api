import { TransactionState, UserType } from '@prisma/client';

import database from '../services/database';
import { Cart, CartWithCartItems, DetailedCart, PrimitiveCartItem } from '../types';
import nanoid from '../utils/nanoid';

export const fetchCart = (cartId: string): Promise<Cart> =>
  database.cart.findUnique({
    where: {
      id: cartId,
    },
  });

export const fetchCarts = (userId: string): Promise<CartWithCartItems[]> =>
  database.cart.findMany({
    where: {
      userId,
    },
    include: {
      cartItems: true,
    },
  });

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

export const forcePay = (userId: string, userType: UserType) => {
  let itemId;

  if (userType === UserType.player) {
    itemId = 'ticket-player';
  } else if (userType === UserType.coach) {
    itemId = 'ticket-coach';
  } else {
    throw new Error(`Can't pay for ${userType}`);
  }

  return database.cart.create({
    data: {
      id: nanoid(),
      transactionState: TransactionState.paid,
      paidAt: new Date(),
      user: {
        connect: { id: userId },
      },
      cartItems: {
        create: [
          {
            id: nanoid(),
            itemId,
            quantity: 1,
            forUserId: userId,
          },
        ],
      },
    },
  });
};
