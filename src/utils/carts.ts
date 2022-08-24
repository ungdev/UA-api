import { Item, ItemCategory } from '../types';

export const applyPartnerDiscount = (items: Item[]) => {
  const discountedItems = items.filter((item) => item.category === ItemCategory.ticket && item.reducedPrice);
  for (const item of discountedItems) {
    [item.price, item.reducedPrice] = [item.reducedPrice, item.price];
  }
};
