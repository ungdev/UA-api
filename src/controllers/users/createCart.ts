import { ItemCategory, UserType } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import Basket from '../../services/etupay';
import { isSelf } from '../../middlewares/parameters';
import { validateBody } from '../../middlewares/validation';
import { createCart } from '../../operations/carts';
import { fetchItems } from '../../operations/item';
import { createVisitor, deleteUser, fetchUser } from '../../operations/user';
import { Cart, Error, PrimitiveCartItem } from '../../types';
import { encodeToBase64, isPartnerSchool, removeAccents } from '../../utils/helpers';
import { badRequest, created, forbidden, notFound, success } from '../../utils/responses';
import { getRequestUser } from '../../utils/user';
import * as validators from '../../utils/validators';
import database from '../../services/database';
import { isShopAllowed } from '../../middlewares/settings';

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
  ...isSelf,

  validateBody(
    Joi.object({
      tickets: Joi.object({
        // We add the optionnal to allow empty array
        userIds: Joi.array().items(validators.id.optional()).required(),
        visitors: Joi.array()
          .items(Joi.object({ firstname: validators.firstname, lastname: validators.lastname }))
          .required(),
      }).required(),
      supplements: Joi.array()
        .items(
          Joi.object({
            itemId: Joi.string().required(),
            quantity: validators.quantity,
          }),
        )
        .required(),
    }).required(),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const body: PayBody = request.body;

      const user = getRequestUser(response);
      const items = await fetchItems();

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

      // Checks if the basket is empty
      if (cartItems.length === 0) {
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
        let { price } = item;

        // Checks if the category is a ticket and the reduce price exists
        if (item.category === ItemCategory.ticket && item.reducedPrice) {
          // Fetch the user who will get the ticket
          const forUser = await fetchUser(cartItem.forUserId);

          // If the ticket is a partner school, set the price to the reduced price
          if (isPartnerSchool(forUser.email)) {
            price = item.reducedPrice;
          }
        }

        // Add the item to the etupay basket
        basket.addItem(removeAccents(item.name), price, cartItem.quantity);
      }

      // Returns a answer with the etupay url
      return created(response, { url: basket.compute(), price: basket.getPrice() });
    } catch (error) {
      return next(error);
    }
  },
];
