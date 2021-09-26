import { ItemCategory, UserType, UserAge } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { Basket } from '../../services/etupay';
import { validateBody } from '../../middlewares/validation';
import { createCart, dropStale } from '../../operations/carts';
import { fetchUserItems } from '../../operations/item';
import { createAttendant, deleteUser, fetchUser, formatUser } from '../../operations/user';
import { Cart, Error, PrimitiveCartItem } from '../../types';
import { encodeToBase64, isPartnerSchool, removeAccents } from '../../utils/helpers';
import { badRequest, created, forbidden, gone, notFound } from '../../utils/responses';
import { getRequestInfo } from '../../utils/users';
import * as validators from '../../utils/validators';
import { isShopAllowed } from '../../middlewares/settings';
import { isAuthenticated } from '../../middlewares/authentication';

export interface PayBody {
  tickets: {
    userIds: string[];
    attendant?: {
      firstname: string;
      lastname: string;
    };
  };
  supplements: {
    itemId: string;
    quantity: number;
  }[];
}

export default [
  // Middlewares
  isShopAllowed,
  ...isAuthenticated,

  validateBody(
    Joi.object({
      tickets: Joi.object({
        // Paying no ticket with this cart is possible, just provide an empty array
        userIds: Joi.array().items(validators.id.optional()).unique().required(),
        attendant: Joi.object({ firstname: validators.firstname, lastname: validators.lastname }).optional(),
      }).required(),
      supplements: Joi.array()
        .items(
          Joi.object({
            itemId: Joi.string().required(),
            quantity: validators.quantity.required(),
          }),
        )
        .unique((a, b) => a.itemId === b.itemId)
        .required(),
    }).required(),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const dropOperation = dropStale();
      const { body } = request as { body: PayBody };

      const requestInfo = getRequestInfo(response);
      let { user } = requestInfo;
      const { team } = requestInfo;

      const items = await fetchUserItems(team);

      const cartItems: PrimitiveCartItem[] = [];

      // Manage the ticket part
      // We use sequential order to be able to send a response in case of bad userId
      for (const userId of body.tickets.userIds) {
        const ticketUser = await fetchUser(userId);

        if (!ticketUser) {
          return notFound(response, Error.UserNotFound);
        }

        // Checks if the user has already paid
        if (ticketUser.hasPaid) {
          return forbidden(response, Error.AlreadyPaid);
        }

        // Checks whether the user can have an attendant because he is an adult
        if (user.age !== UserAge.child && body.tickets.attendant) return forbidden(response, Error.AttendantNotAllowed);

        // Checks whether a child has already registered an attendant
        if (user.attendantId && body.tickets.attendant) return forbidden(response, Error.AttendantAlreadyRegistered);

        // Defines the ticket id to be either a player or a coach
        let itemId;

        switch (ticketUser.type) {
          case UserType.player:
          case UserType.coach:
          case UserType.spectator:
            itemId = `ticket-${ticketUser.type}`;
            break;
          default:
            return forbidden(response, Error.NotPlayerOrCoachOrSpectator);
        }

        // Adds the item to the basket
        cartItems.push({
          itemId,
          quantity: 1,
          forUserId: ticketUser.id,
        });
      }

      // Manage the supplement part. For now, the user can only buy supplements for himself
      for (const supplement of body.supplements) {
        if (!items.some((item) => item.id === supplement.itemId && item.category === ItemCategory.supplement)) {
          return notFound(response, Error.ItemNotFound);
        }

        // Push the supplement to the basket
        cartItems.push({
          itemId: supplement.itemId,
          quantity: supplement.quantity,
          forUserId: user.id,
        });
      }

      // Checks if the basket is empty and there is no visitors
      // This check is used before the visitors because the visitors write in database
      if (cartItems.length === 0 && !body.tickets.attendant) {
        return badRequest(response, Error.EmptyBasket);
      }

      // Calculate if each cart item is available
      const itemsWithStock = items.filter((item) => item.left !== undefined);

      // Wait for sql delete query to end (if not already ended)
      const [droppedItemsResult, droppedCartsResult] = await dropOperation;
      // Check if rows (ie. carts) were updated
      if (droppedCartsResult.count > 0 && droppedItemsResult.count > 0) {
        // Update fetched items
        const refetchedItems = await fetchUserItems(team);
        for (const item of itemsWithStock)
          item.left = refetchedItems.find((fetchedItem) => fetchedItem.id === item.id).left;
      }

      // Foreach item where there is a stock
      for (const item of itemsWithStock) {
        // Checks how many items the user has orders and takes account the quantity
        const cartItemsCount = cartItems.reduce((previous, cartItem) => {
          if (cartItem.itemId === item.id) {
            return previous + cartItem.quantity;
          }

          return previous;
        }, 0);

        // If the user has ordered at least one team and the items left are less than in stock, throw an error
        if (cartItemsCount > 0 && item.left < cartItemsCount) {
          return gone(response, Error.ItemOutOfStock);
        }
      }

      // Defines the cart
      let cart: Cart;

      // We use a try here because we make SQL requests without a transaction
      // The try catch ensures if the createAttendant or createCart fails, the created attendants are deleted
      try {
        if (body.tickets.attendant) {
          // Creates the attendant
          user = formatUser(
            await createAttendant(user.id, body.tickets.attendant.firstname, body.tickets.attendant.lastname),
          );

          // Add the item to the basket
          cartItems.push({
            itemId: 'ticket-attendant',
            quantity: 1,
            forUserId: user.attendantId,
          });
        }

        // Set the cart variable defined outside the try/catch block
        cart = await createCart(user.id, cartItems);
      } catch (error) {
        const attendantTicket = cartItems.find((cartItem) => cartItem.itemId === 'ticket-attendant');
        await deleteUser(attendantTicket.forUserId);
        return next(error);
      }

      // Creates a etupay basket. The accents need to be removed as on the website they don't appear otherwise
      // We also send as encoded data the cartId to be able to retreive it in the callback
      const basket = new Basket(
        'UTT Arena',
        removeAccents(user.firstname),
        removeAccents(user.lastname),
        user.email,
        'checkout',
        encodeToBase64({ cartId: cart.id }),
      );

      // Foreach cartitem
      for (const cartItem of cartItems) {
        // Finds the item associated with the cartitem
        const item = items.find((findItem) => findItem.id === cartItem.itemId);

        // Retreives the price of the item
        let itemPrice = item.price;

        // Checks if the category is a ticket and the reduce price exists
        if (item.category === ItemCategory.ticket && item.reducedPrice) {
          // Fetch the user who will get the ticket
          const forUser = await fetchUser(cartItem.forUserId);

          // If the ticket is a partner school, set the price to the reduced price
          if (isPartnerSchool(forUser.email)) {
            itemPrice = item.reducedPrice;
          }
        }

        // Add the item to the etupay basket
        basket.addItem(removeAccents(item.name), itemPrice, cartItem.quantity);
      }

      if (basket.getPrice() < 0) {
        return forbidden(response, Error.BasketCannotBeNegative);
      }

      // Returns a answer with the etupay url
      return created(response, { url: basket.compute(), price: basket.getPrice() });
    } catch (error) {
      return next(error);
    }
  },
];
