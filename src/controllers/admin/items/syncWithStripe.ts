import { NextFunction, Request, Response } from 'express';
import Stripe from 'stripe';
import { hasPermission } from '../../../middlewares/authentication';
import { Item, Permission } from '../../../types';
import { noContent } from '../../../utils/responses';
import { fetchAllItems, updateAdminItem } from '../../../operations/item';
import env from '../../../utils/env';

const stripe = new Stripe(env.stripe.token);

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
      // Fetch all products
      const remainingStripeProducts: Array<{ product: Stripe.Product; prices: Stripe.Price[] }> = [];
      hasMore = true;
      while (hasMore) {
        const stripeResponse = await stripe.products.list({
          limit: 100,
          starting_after: remainingStripeProducts.at(-1)?.product.id,
        });
        remainingStripeProducts.push(
          ...stripeResponse.data.map((product) => ({
            product,
            prices: prices.filter((price) => price.product === product.id),
          })),
        );
        hasMore = stripeResponse.has_more;
      }

      // Try to map items to products & prices
      const mapping: Array<[Item, { product: Stripe.Product; prices: Stripe.Price[] }]> = [];
      const remainingItems: Item[] = [];
      for (const item of items) {
        const stripeProductIndex = remainingStripeProducts.findIndex(
          ({ product }) => product.id === item.stripeProductId,
        );
        if (stripeProductIndex === -1) {
          remainingItems.push(item);
        } else {
          const stripeProduct = remainingStripeProducts.splice(stripeProductIndex, 1)[0];
          mapping.push([item, stripeProduct]);
        }
      }

      // Verify prices are correct for mapped items
      for (const [item, stripeProduct] of mapping) {
        const defaultPriceIndex = stripeProduct.prices.findIndex(
          (price) => price.id === item.stripePriceId && price.unit_amount === item.price,
        );
        let stripeDefaultPrice: Stripe.Price;
        if (defaultPriceIndex === -1) {
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

      // Create stripe products for unmatched items
      for (const item of remainingItems) {
        const stripeProduct = await stripe.products.create({
          name: item.name,
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
          stripeReducedPriceId: reducedStripePrice?.id,
        });
      }

      // Remove unmatched stripe products
      for (const product of remainingStripeProducts) {
        // First, remove prices
        for (const price of product.prices) {
          await stripe.prices.update(price.id, {
            active: false,
          });
        }
        await stripe.products.del(product.product.id);
      }
      return noContent(response);
    } catch (error) {
      return next(error);
    }
  },
];
