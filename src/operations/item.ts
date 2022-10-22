import database from '../services/database';
import { Item, Team, TransactionState, User } from '../types';
import { isPartnerSchool } from '../utils/helpers';

export const fetchAllItems = async (): Promise<Item[]> => {
  // fetches the items
  let items = await database.item.findMany();
  const order = ['tshirt-s', 'tshirt-m', 'tshirt-l', 'tshirt-xl'];
  // sort items according to size attribute
  items = items.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  // Add a left property which tells how many items are there left
  return Promise.all(
    items.map(async (item): Promise<Item> => {
      // Defines the left variable to undefined
      let left;

      // If the item contains stocks, computes the left variables
      if (typeof item.stock === 'number') {
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

        // Calculates how many items were ordered by adding all the quantity ordered
        const count = cartItems.reduce((previous, current) => previous + current.quantity, 0);

        // Returns the stock minus the count. The max 0 is used in case of negative number, which should never happen
        left = Math.max(item.stock - count, 0);
      }

      return {
        ...item,
        left,
      };
    }),
  );
};

export const fetchUserItems = async (team?: Team, user?: User) => {
  let items = await fetchAllItems();
  if (!user || !isPartnerSchool(user.email)) {
    for (const item of items) item.reducedPrice = null;
  }

  // Check if user is not in SSBU tournament
  if (!team || team.tournamentId !== 'ssbu') {
    // Remove the SSBU discount
    items = items.filter((element) => element.id !== 'discount-switch-ssbu');
  }

  const currentTicket =
    items.find((item) => item.id === `ticket-player-${team?.tournamentId}`) ??
    items.find((item) => item.id === 'ticket-player');
  items = [
    ...items.filter((item) => !item.id.startsWith('ticket-player')),
    {
      ...currentTicket,
      id: 'ticket-player',
    },
  ];

  return items;
};

export const findAdminItem = async (itemId: string) => {
  const item = await database.item.findUnique({ where: { id: itemId } });
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
  const count = cartItems.reduce((previous, current) => previous + current.quantity, 0);
  return { ...item, left: item.stock - count };
};

export const updateAdminItemStock = async (itemId: string, newStock: number) => {
  const item = await database.item.update({ data: { stock: newStock }, where: { id: itemId } });
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

  // Calculates how many items were ordered by adding all the quantity ordered
  const count = cartItems.reduce((previous, current) => previous + current.quantity, 0);
  return { ...item, left: newStock - count };
};
