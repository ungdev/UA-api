import { TransactionState } from '@prisma/client';

import database from '../services/database';
import { PrimitiveCartItem } from '../types';
import nanoid from '../utils/nanoid';

export const createCart = (userId: string, cartItems: PrimitiveCartItem[]) => {
  return database.cart.create({
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
};

export const payCart = (cartId: string, transactionId: number) => {
  return database.cart.update({
    data: {
      transactionState: TransactionState.paid,
      paidAt: new Date(),
      transactionId,
    },
    where: {
      id: cartId,
    },
  });
};
