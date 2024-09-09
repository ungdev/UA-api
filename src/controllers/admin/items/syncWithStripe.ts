import { NextFunction, Request, Response } from 'express';
import Stripe from 'stripe';
import { hasPermission } from '../../../middlewares/authentication';
import { Item, Permission } from '../../../types';
import { noContent } from '../../../utils/responses';
import { fetchAllItems, updateAdminItem } from '../../../operations/item';
import { stripe } from '../../../utils/stripe';

function clampString(string_: string, maxLength: number) {
  return string_.length > maxLength ? `${string_.slice(0, maxLength - 3)}...` : string_;
}

export default [
  // Middlewares
  ...hasPermission(Permission.admin),
  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const items = await fetchAllItems();
      // Fetch all prices
      const prices: Stripe.Price[] = [];
      let hasMore = true;
      while (hasMore) {
        const stripeResponse = await stripe.prices.list({
          limit: 100,
          starting_after: prices.at(-1)?.id,
        });
        prices.push(...stripeResponse.data);
        hasMore = stripeResponse.has_more;
      }
      // Fetch all products, and bind them with their prices
      const remainingStripeProducts: Array<{ product: Stripe.Product; prices: Stripe.Price[] }> = [];
      hasMore = true;
      while (hasMore) {
        const stripeResponse = await stripe.products.list({
          limit: 100,
          starting_after: remainingStripeProducts.at(-1)?.product.id,
          active: true,
        });
        remainingStripeProducts.push(
          ...stripeResponse.data.map((product) => ({
            product,
            prices: prices.filter((price) => price.product === product.id),
          })),
        );
        hasMore = stripeResponse.has_more;
      }

      // Fetch all coupons
      const remainingStripeCoupons: Stripe.Coupon[] = [];
      hasMore = true;
      while (hasMore) {
        const stripeResponse = await stripe.coupons.list({
          limit: 100,
          starting_after: remainingStripeCoupons.at(-1)?.id,
        });
        remainingStripeCoupons.push(...stripeResponse.data);
        hasMore = stripeResponse.has_more;
      }

      // Try to map items to products & prices
      const productsMapping: Array<[Item, { product: Stripe.Product; prices: Stripe.Price[] }]> = [];
      const remainingItems: Item[] = [];
      const remainingDiscountItems: Item[] = []; // Items with a negative price are coupons, not products
      const discountsMapping: Array<[Item, Stripe.Coupon]> = [];
      for (const item of items) {
        // Check if item should be interpreted as a coupon or a reduction
        if (item.price > 0) {
          const stripeProductIndex = remainingStripeProducts.findIndex(
            ({ product }) => product.id === item.stripeProductId,
          );
          if (stripeProductIndex === -1) {
            // There is no stripe product associated with this item.
            remainingItems.push(item);
          } else {
            // We found a Stripe product to map with this item.
            const stripeProduct = remainingStripeProducts.splice(stripeProductIndex, 1)[0];
            productsMapping.push([item, stripeProduct]);
          }
        } else {
          const stripeCouponIndex = remainingStripeCoupons.findIndex(
            (coupon) => coupon.id === item.stripePriceId && coupon.amount_off === item.price, // We can't change the price of a coupon, so if it doesn't have the right price, consider it as not mapped
          );
          if (stripeCouponIndex === -1) {
            // There is no Stripe coupon associated with this item.
            remainingDiscountItems.push(item);
          } else {
            // We found a Stripe coupon to map with this item.
            const stripeCoupon = remainingStripeCoupons.splice(stripeCouponIndex, 1)[0];
            discountsMapping.push([item, stripeCoupon]);
          }
        }
      }

      // Verify prices are correct for mapped products
      for (const [item, stripeProduct] of productsMapping) {
        const defaultPriceIndex = stripeProduct.prices.findIndex(
          (price) => price.id === item.stripePriceId && price.unit_amount === item.price,
        );
        let stripeDefaultPrice: Stripe.Price;
        if (defaultPriceIndex === -1) {
          // There is no price to map with the default price of the shop, we create a new one (it's impossible to modify the value of a price)
          stripeDefaultPrice = await stripe.prices.create({
            currency: 'eur',
            product: stripeProduct.product.id,
            unit_amount: item.price,
          });
        } else {
          [stripeDefaultPrice] = stripeProduct.prices.splice(defaultPriceIndex, 1);
        }
        if (stripeProduct.product.default_price !== stripeDefaultPrice.id) {
          await stripe.products.update(stripeProduct.product.id, {
            default_price: stripeDefaultPrice.id,
          });
        }
        let stripeReducedPrice: Stripe.Price;
        if (item.reducedPrice !== null) {
          // If item has a reduced price, we try to find one that could match.
          // The default price was either not present in the list or has been removed by the splice called earlier.
          const reducedPriceIndex = stripeProduct.prices.findIndex(
            (price) => price.id === item.stripeReducedPriceId && price.unit_amount === item.price,
          );
          stripeReducedPrice =
            reducedPriceIndex === -1
              ? await stripe.prices.create({
                  currency: 'eur',
                  product: stripeProduct.product.id,
                  unit_amount: item.reducedPrice,
                })
              : stripeProduct.prices.splice(defaultPriceIndex, 1)[0];
        }
        const stripeReducedPriceId = stripeReducedPrice?.id ?? null;
        if (item.stripePriceId !== stripeDefaultPrice.id || item.stripeReducedPriceId !== stripeReducedPriceId) {
          // If one of the Stripe price or the stripe reduced price has been modified, modify their IDs in the database.
          await updateAdminItem(item.id, {
            stripePriceId: stripeDefaultPrice.id,
            stripeReducedPriceId,
          });
        }
        // Remaining linkedPrices are superfluous
        // We cannot remove stripe prices, we can only deactivate them.
        for (const price of stripeProduct.prices) {
          await stripe.prices.update(price.id, { active: false });
        }
      }

      // Verify names are correct for mapped discounts (prices have already been verified during mapping)
      for (const [item, stripeCoupon] of discountsMapping) {
        if (item.name !== stripeCoupon.name) {
          await stripe.coupons.update(stripeCoupon.id, {
            name: clampString(item.name, 40),
          });
        }
      }

      // Create Stripe products for unmatched items, quite straightforward
      for (const item of remainingItems) {
        const stripeProduct = await stripe.products.create({
          name: clampString(item.name, 40),
          default_price_data: {
            currency: 'eur',
            unit_amount: item.price,
          },
        });
        let reducedStripePrice: Stripe.Price;
        if (item.reducedPrice !== null) {
          reducedStripePrice = await stripe.prices.create({
            product: stripeProduct.id,
            currency: 'eur',
            unit_amount: item.reducedPrice,
          });
        }
        await updateAdminItem(item.id, {
          stripeProductId: stripeProduct.id,
          stripePriceId: stripeProduct.default_price as string,
          stripeReducedPriceId: reducedStripePrice?.id ?? null,
        });
      }

      // Create Stripe coupons for unmatched discount items, even more straightforward
      for (const item of remainingDiscountItems) {
        const stripeCoupon = await stripe.coupons.create({
          name: clampString(item.name, 40),
          currency: 'eur',
          amount_off: -item.price,
        });
        await updateAdminItem(item.id, { stripePriceId: stripeCoupon.id ?? null });
      }

      // Remove unmatched stripe products.
      // For each product we deactivate it and its prices.
      for (const product of remainingStripeProducts) {
        await stripe.products.update(product.product.id, {
          active: false,
        });
        for (const price of product.prices) {
          await stripe.prices.update(price.id, {
            active: false,
          });
        }
      }

      // Remove unmatched Stripe coupons.
      for (const coupon of remainingStripeCoupons) {
        await stripe.coupons.del(coupon.id);
      }
      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
