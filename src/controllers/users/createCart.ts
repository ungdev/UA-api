import { ItemCategory, UserType } from '@prisma/client';
import { Basket } from '@ung/node-etupay';
import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { isSelf } from '../../middlewares/parameters';
import validateBody from '../../middlewares/validateBody';
import { createCart } from '../../operations/carts';
import { fetchItems } from '../../operations/item';
import { createVisitor, fetchUser } from '../../operations/user';
import { Error, PrimitiveCartItem } from '../../types';
import { encodeToBase64, isPartnerSchool, removeAccents } from '../../utils/helpers';
import { badRequest, forbidden, notFound, success } from '../../utils/responses';
import { getRequestUser } from '../../utils/user';
import * as validators from '../../utils/validators';

interface PayBody {
  tickets: {
    userIds: string[];
    visitors: {
      firstname: string;
      lastname: string;
    }[];
  };
  supplements: {
    id: string;
    quantity: number;
  }[];
}

export default [
  // Middlewares
  ...isSelf,

  validateBody(
    Joi.object({
      tickets: Joi.object({
        userIds: Joi.array().items(validators.id).default([]),
        visitors: Joi.array()
          .items(Joi.object({ firstname: validators.firstname, lastname: validators.lastname }))
          .default([]),
      }),
      items: Joi.array()
        .items(
          Joi.object({
            id: Joi.string().required(),
            quantity: validators.quantity,
          }),
        )
        .default([]),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const body: PayBody = request.body;
      // const users: User[] = await fetchUsers();
      // const result = users.map(filterUserRestricted);

      // has already paid
      // check utt

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

      // Manage the supplement part. For now, the user can only buy supplements for himself
      for (const supplement of body.supplements) {
        if (!items.find((item) => item.id === supplement.id && item.category === ItemCategory.supplement)) {
          return notFound(response, Error.ItemNotFound);
        }

        cartItems.push({
          itemId: supplement.id,
          quantity: supplement.quantity,
          forUserId: user.id,
        });
      }

      const cart = await createCart(user.id, cartItems);

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

      // Checks if the basket is empty
      if (basket.getPrice() === 0) {
        return badRequest(response, Error.BasketEmpty);
      }

      // Returns a answer with the etupay url
      return success(response, { url: basket.compute() });
    } catch (error) {
      return next(error);
    }
  },
];
