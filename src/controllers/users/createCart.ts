import { ItemCategory, UserType } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { Basket } from '../../services/etupay';
import { validateBody } from '../../middlewares/validation';
import { createCart } from '../../operations/carts';
import { fetchUserItems } from '../../operations/item';
import { createVisitor, deleteUser, fetchUser } from '../../operations/user';
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
    visitors: {
      firstname: string;
      lastname: string;
    }[];
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
        // We add the optionnal to allow empty array
        userIds: Joi.array().items(validators.id.optional()).unique().required(),
        visitors: Joi.array()
          .items(Joi.object({ firstname: validators.firstname, lastname: validators.lastname }))
          .required(),
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
      const { body } = request;

      const { user, team } = getRequestInfo(response);
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

        // Defines the ticket id to be either a player or a coach
        let itemId;

        // If the user is a player
        if (ticketUser.type === UserType.player) {
          itemId = 'ticket-player';

          // If the user is a coach
        } else if (ticketUser.type === UserType.coach) {
          itemId = 'ticket-coach';

          // Otherwise, throws an error
        } else {
          return forbidden(response, Error.NotPlayerOrCoach);
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
      if (cartItems.length === 0 && body.tickets.visitors.length === 0) {
        return badRequest(response, Error.EmptyBasket);
      }

      // Defines the cart
      let cart: Cart;

      // We use a try here because we make SQL requests without a transaction
      // The try catch ensures if the createVisitor or createCart fails, the create visitors are deleted
      try {
        // Manage the visitor parts
        for (const visitor of body.tickets.visitors) {
          // Creates the visitor
          const visitorUser = await createVisitor(visitor.firstname, visitor.lastname);

          // Add the item to the basket
          cartItems.push({
            itemId: 'ticket-visitor',
            quantity: 1,
            forUserId: visitorUser.id,
          });
        }

        // Set the cart variable defined outside the try/catch block
        cart = await createCart(user.id, cartItems);
      } catch (error) {
        await Promise.all(
          cartItems
            .filter((cartItem) => cartItem.itemId === 'ticket-visitor')
            .map((cartItem) => deleteUser(cartItem.forUserId)),
        );
        return next(error);
      }

      // Calculate if each cart item is available
      const itemsWithStock = items.filter((item) => item.left);

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

      // Returns a answer with the etupay url
      return created(response, { url: basket.compute(), price: basket.getPrice() });
    } catch (error) {
      return next(error);
    }
  },
];
