import { TransactionState } from '@prisma/client';
import { request } from 'express';
import database from '../services/database';
import { Item } from '../types';

export const fetchItems = async (): Promise<Item[]> => {
  // fetches the items
  const items = await database.item.findMany();

  // Add a left property which tells how many items are there left
  return Promise.all(
    items.map(
      async (item): Promise<Item> => {
        // Defines the left variable to undefined
        let left;

        // If the item contains stocks, computes the left variables
        if (item.stock) {
          // Fetches all the cart items related to the item
          const cartItems = await database.cartItem.findMany({
            where: {
              itemId: item.id,
              cart: {
                transactionState: {
                  in: [TransactionState.paid, TransactionState.pending],
                },
              },
            },
          });

          // Calculates how many items where ordered by adding all the quantity ordered
          const count = cartItems.reduce((previous, current) => previous + current.quantity, 0);

          // Returns the stock minus the count. The max 0 is used in case of negative number, which should never happen
          left = Math.max(item.stock - count, 0);
        }

        return {
          ...item,
          left,
        };
      },
    ),
  );
};
