import fs from 'fs/promises';
import { ItemCategory, TournamentId, TransactionState, UserType } from '@prisma/client';
import { createFakeTeam, createFakeUser } from '../utils';
import { DetailedCart, DetailedCartItem, Error, PrimitiveCartItem } from '../../src/types';
import { createCart, fetchCart, updateCart } from '../../src/operations/carts';
import { generatePayementHtml } from '../../src/services/email';
import { randomInt } from '../../src/utils/helpers';
import { getCaptain } from '../../src/utils/teams';
import { fetchItems } from '../../src/operations/item';

describe.only('Tests the PDF utils', () => {
  it(`should generate a payment template`, async () => {
    // Create a fake user and add it in a random team
    const user = await createFakeUser();
    const visitor = await createFakeUser({ type: UserType.visitor });
    const coach = await createFakeUser({ type: UserType.coach });

    const items = await fetchItems();
    const supplements = items.filter((item) => item.category === ItemCategory.supplement);

    // Generate a cart item for each supplement
    const supplementsCartItems: PrimitiveCartItem[] = supplements.map((supplement) => ({
      itemId: supplement.id,
      quantity: randomInt(1, 5),
      forUserId: user.id,
    }));

    const createdCart = await createCart(user.id, [
      { itemId: 'ticket-player', quantity: 1, forUserId: user.id },
      { itemId: 'ticket-visitor', quantity: 1, forUserId: visitor.id },
      { itemId: 'ticket-coach', quantity: 1, forUserId: coach.id },
      ...supplementsCartItems,
    ]);

    const detailedCart = await updateCart(createdCart.id, 123, TransactionState.paid);

    const html = generatePayementHtml(detailedCart);

    await fs.writeFile('artifacts/payment.html', html);
  });
});
