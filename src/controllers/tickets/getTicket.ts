import { ItemCategory, TransactionState } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { isAuthenticated } from '../../middlewares/authentication';
import { fetchCartItem } from '../../operations/cartItem';
import { fetchCart } from '../../operations/carts';
import { Error } from '../../types';
import { generateTicket } from '../../utils/pdf';
import { forbidden, notFound } from '../../utils/responses';
import { getRequestInfo } from '../../utils/user';

export default [
  // Middlewares
  ...isAuthenticated,

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const { cartItemId } = request.params;

      // Retrieves the cart item
      const ticket = await fetchCartItem(cartItemId);

      // Check if the ticket exists and is a ticket
      if (!ticket || ticket.item.category !== ItemCategory.ticket) return notFound(response, Error.TicketNotFound);

      // Retreive the associated cart
      const { user } = getRequestInfo(response);
      const cart = await fetchCart(ticket.cartId);

      // Check if the cart has been paid by the user or for him/her
      if (cart.userId !== user.id && ticket.forUserId !== user.id) return forbidden(response, Error.NotSelf);

      // Check that the cart is paid
      if (cart.transactionState !== TransactionState.paid) return forbidden(response, Error.NotPaid);

      // Generate the pdf
      const pdf = await generateTicket(ticket);

      // Send the pdf
      return response.set('Content-Type', 'application/pdf').send(pdf).end();
    } catch (error) {
      return next(error);
    }
  },
];
