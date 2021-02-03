import { TransactionState, UserType } from '@prisma/client';

import database from '../services/database';
import { PrimitiveCartItem } from '../types';
import nanoid from '../utils/nanoid';

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

export const payCart = (cartId: string, transactionId: number) =>
  database.cart.update({
    data: {
      transactionState: TransactionState.paid,
      paidAt: new Date(),
      transactionId,
    },
    where: {
      id: cartId,
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
