import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { hasPermission } from '../../../middlewares/authentication';
import { Error, ItemCategory, Permission } from '../../../types';
import { notFound, success } from '../../../utils/responses';
import { filterAdminItem } from '../../../utils/filters';
import { validateBody } from '../../../middlewares/validation';
import { fetchAllItems, updateAdminItem } from '../../../operations/item';
import { clampString, stripe } from '../../../utils/stripe';

export default [
  // Middlewares
  ...hasPermission(Permission.admin),
  validateBody(
    Joi.object({
      name: Joi.string(),
      category: Joi.string().valid(ItemCategory.rent, ItemCategory.supplement, ItemCategory.ticket),
      attribute: Joi.string(),
      price: Joi.number().integer(),
      reducedPrice: Joi.number().integer(),
      infos: Joi.string(),
      image: Joi.string(),
      stockDifference: Joi.number().integer(),
      availableFrom: Joi.date(),
      availableUntil: Joi.date(),
    }),
  ),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const oldItem = (await fetchAllItems()).find((item) => item.id === request.params.itemId);

      const {
        name,
        category,
        attribute,
        price,
        reducedPrice,
        infos,
        image,
        stockDifference,
        availableFrom,
        availableUntil,
      } = {
        ...oldItem,
        stockDifference: 0,
        ...(request.body as {
          name: string;
          category: ItemCategory;
          attribute: string;
          price: number;
          reducedPrice: number;
          infos: string;
          image: string;
          stockDifference: number;
          availableFrom: Date;
          availableUntil: Date;
        }),
      };

      if (!oldItem) {
        return notFound(response, Error.ItemNotFound);
      }

      // Don't want to explain this, you'll understand the code (hopefully)
      // HAHAHA JK GOT YA there are some comments
      let { stripeProductId, stripePriceId, stripeReducedPriceId } = oldItem;
      if (oldItem.price > 0) {
        const createStripeProduct = !stripeProductId;
        if (createStripeProduct) {
          // No product is associated with this item yet.
          const stripeProduct = await stripe.products.create({
            name: clampString(name),
            default_price_data: {
              currency: 'eur',
              unit_amount: price ?? oldItem.price,
            },
          });
          stripeProductId = stripeProduct.id;
          stripePriceId = stripeProduct.default_price as string;
        } else if (price !== oldItem.price) {
          // Update the price if needed (and if we didn't create the product).
          await stripe.prices.update(stripePriceId, {
            active: false,
          }); // That's impossible to delete a price with the API.
          stripePriceId = (
            await stripe.prices.create({
              product: stripeProductId,
              currency: 'eur',
              unit_amount: price,
            })
          ).id;
        }
        // If the reducedPrice changed, OR we just created a product for this item, we delete / create a reduced price.
        if (reducedPrice !== oldItem.reducedPrice || createStripeProduct) {
          if (stripeReducedPriceId) {
            // If there is already a reduced price in Stripe, we delete it, before creating a new one (or not if the reduced price has been removed).
            await stripe.prices.update(stripeReducedPriceId, {
              active: false,
            });
          }
          if (reducedPrice !== null) {
            // If there is a new reduced price, we create it.
            stripeReducedPriceId = (
              await stripe.prices.create({
                product: stripeProductId,
                currency: 'eur',
                unit_amount: reducedPrice,
              })
            ).id;
          }
        }
        // If the name or the stripePriceId of the item changed, reflect the change in Stripe (if product was just created, skip, as name and default_price have already been set).
        // eslint-disable-next-line unicorn/consistent-destructuring -- eslint is drunk
        if ((name !== oldItem.name || stripePriceId !== oldItem.stripePriceId) && !createStripeProduct) {
          await stripe.products.update(stripeProductId, {
            name: clampString(name),
            default_price: stripePriceId,
          });
        }
      } else if (price !== oldItem.price || !stripePriceId) {
        // HAHAHA IT'S NOT DONE YET (yes, i realized it after, we still need to manage the case where the item is a coupon)
        // If the price (discount, but we'll use term "price") has changed, or it hasn't been sync-ed with Stripe,
        // we delete the old coupon (if it exists) and create a new one with the right price.
        // If name has changed, it will be updated at the same time.
        if (stripePriceId) await stripe.coupons.del(stripePriceId);
        stripePriceId = (
          await stripe.coupons.create({
            name: clampString(name),
            currency: 'eur',
            amount_off: -price,
          })
        ).id;
      } else if (name !== oldItem.name) {
        // And finally, if we have a discount item, and we did not update the price (nor created it), we update the name.
        await stripe.coupons.update(stripePriceId, { name: clampString(name) });
      }

      // AAAAAAAAANNNNNNNNDDD... UPDATE THE ITEM, YEAAHH
      const item = await updateAdminItem(request.params.itemId, {
        name,
        category,
        attribute,
        price,
        reducedPrice,
        infos,
        image,
        stockDifference,
        availableFrom,
        availableUntil,
        stripeProductId,
        stripePriceId,
        stripeReducedPriceId,
      });

      return success(response, filterAdminItem(item));
    } catch (error) {
      return next(error);
    }
  },
];
