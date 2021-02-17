import database from '../services/database';
import { DetailedCartItem } from '../types';

export const fetchCartItem = (cartItemId: string): Promise<DetailedCartItem> =>
  database.cartItem.findUnique({
    where: {
      id: cartItemId,
    },
    include: {
      item: true,
      forUser: true,
    },
  });
