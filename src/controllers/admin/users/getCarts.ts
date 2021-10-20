import { NextFunction, Request, Response } from "express";
import { fetchCarts } from "../../../operations/carts";
import { filterCartWithCartItems } from "../../../utils/filters";
import { notFound, success } from "../../../utils/responses";
import { hasPermission } from "../../../middlewares/authentication";
import { fetchUser } from "../../../operations/user";
import { CartWithCartItemsAdmin, Error, Permission } from "../../../types";
import { fetchAllItems } from "../../../operations/item";
import { isPartnerSchool } from "../../../utils/helpers";
import { ItemCategory } from ".prisma/client";
import { AdminAnalyticsGetFileResponse } from "@slack/web-api";
import { JsonObject } from "swagger-ui-express";

export default [
  // Middlewares
  //...hasPermission(Permission.admin),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const user = await fetchUser(request.params.userId);

      if (!user) return notFound(response, Error.UserNotFound);

      const carts = await fetchCarts(user.id);
      const items = await fetchAllItems();
     
      if(carts[0] != undefined){
        let cartsFinal = [];
        for (let i = 0; i < carts.length; i++) {
          let totalPrice = 0;
          let cart = carts[i] as JsonObject;
          // add item name and total price
          for (let j = 0; j < cart["cartItems"].length; j++) {

            const cartItem = cart["cartItems"][j] as JsonObject;

            // Finds the item associated with the cartitem
            const item = items.find(
              (findItem) => findItem.id === cartItem.itemId
            );

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
            
            totalPrice += itemPrice * cartItem.quantity;
            cartItem["itemName"] = item.name;
            cart["cartItems"][j] = cartItem;
          }

          cart["totalPrice"] = totalPrice;
          cartsFinal.push(cart);
        }

        let cartsFinalTyped = (cartsFinal as unknown) as CartWithCartItemsAdmin;

        return success(response, cartsFinalTyped);
      }
      return success(response, carts.filter(filterCartWithCartItems));
    } catch (error) {
      return next(error);
    }
  },
];
