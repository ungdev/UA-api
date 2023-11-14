import database from '../services/database';
import { Item, ItemCategory, Team, TransactionState, User, UserType } from '../types';
import { isPartnerSchool } from '../utils/helpers';

export const fetchAllItems = async (): Promise<Item[]> => {
  // fetches the items
  const items = await database.item.findMany({ orderBy: [{ position: 'asc' }] });

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

  const alreadyExistingDiscount = user?.cartItems.find(
    (cartItem) =>
      cartItem.itemId === 'discount-switch-ssbu' &&
      (cartItem.cart.transactionState === TransactionState.paid ||
        cartItem.cart.transactionState === TransactionState.pending),
  );

  // Check if user is not in SSBU tournament
  if (!team || team.tournamentId !== 'ssbu' || alreadyExistingDiscount?.cart.transactionState === 'paid') {
    // Remove the SSBU discount
    items = items.filter((element) => element.id !== 'discount-switch-ssbu');
  } else if (!team || team.tournamentId !== 'ssbu' || alreadyExistingDiscount?.cart.transactionState === 'pending') {
    // The user then has a pending cart with a SSBU discount
    // Before being able to add it to his cart again, he needs to wait an hour for the cart to expire (and not pay it during that time)
    items.find((element) => element.id === 'discount-switch-ssbu').left = -1;
  }

  if (!user || user.type !== UserType.player || !team || team.tournamentId === 'ssbu') {
    // Remove rents
    items = items.filter((element) => element.category !== ItemCategory.rent);
  }

  const currentTicket =
    items.find((item) => item.id === `ticket-player-${team?.tournamentId}`) ??
    items.find((item) => item.id === 'ticket-player');
  // Remove every ticket-player* item except the currentTicket
  items = items.filter((item) => !item.id.startsWith('ticket-player') || item.id === currentTicket.id);
  // Update the currentTicket id
  currentTicket.id = 'ticket-player';

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

export const updateAdminItem = async (
  itemId?: string,
  name?: string,
  category?: ItemCategory,
  attribute?: string,
  price?: number,
  reducedPrice?: number,
  infos?: string,
  image?: string,
  stockDifference?: number,
  availableFrom?: Date,
  availableUntil?: Date,
): Promise<Item> => {
  const newStock = stockDifference
    ? (
        await database.item.findUnique({
          where: {
            id: itemId,
          },
          select: { stock: true },
        })
      ).stock + stockDifference
    : undefined;
  const item = await database.item.update({
    data: {
      name,
      category,
      attribute,
      price,
      reducedPrice,
      infos,
      image,
      stock: newStock,
      availableFrom,
      availableUntil,
    },
    where: { id: itemId },
  });
  const cartItems = await database.cartItem.findMany({
    where: {
      itemId: item.id,
      cart: {
        transactionState: {
          in: [TransactionState.paid, TransactionState.pending, TransactionState.authorization],
        },
      },
    },
  });
  // Calculates how many items were ordered by adding all the quantity ordered
  const count = cartItems.reduce((previous, current) => previous + current.quantity, 0);
  return { ...item, left: item.stock - count };
};

export const updateItemsPosition = (items: { id: string; position: number }[]) =>
  Promise.all(
    items.map((item) =>
      database.item.update({
        where: {
          id: item.id,
        },
        data: {
          position: item.position,
        },
      }),
    ),
  );
