import fs from 'fs/promises';
import { UserType } from '@prisma/client';
import { createFakeTeam, createFakeTournament, createFakeUser } from '../utils';
import { createCart, updateCart } from '../../src/operations/carts';
import { generateTicket } from '../../src/utils/ticket';
import { getCaptain } from '../../src/utils/teams';
import database from '../../src/services/database';
import { TransactionState } from '../../src/types';
import { fetchAllItems } from '../../src/operations/item';
import { updateAdminUser } from '../../src/operations/user';

describe('Tests the PDF utils', () => {
  after(async () => {
    await database.team.deleteMany();
    await database.cart.deleteMany();
    await database.orga.deleteMany();
    await database.user.deleteMany();
    await database.tournament.deleteMany();
  });

  let placeId = 0;

  it(`should generate a PDF ticket for a player`, async () => {
    // Create a fake user and add it in a random team
    const tournament = await createFakeTournament();
    const team = await createFakeTeam({ tournament: tournament.id });
    const user = getCaptain(team);

    await updateAdminUser(user, {
      place: `A0${++placeId}`,
    });

    const createdCart = await createCart(user.id, [
      {
        itemId: 'ticket-player',
        quantity: 1,
        price: (await fetchAllItems()).find((item) => item.id === 'ticket-player')!.price,
        forUserId: user.id,
      },
    ]);

    const detailedCart = await updateCart(createdCart.id, 123, TransactionState.paid);

    const cartItem = detailedCart.cartItems[0];

    const pdf = await generateTicket(cartItem);

    await fs.writeFile(`artifacts/${tournament.id}.pdf`, pdf.content);
  });

  it(`should generate a PDF ticket for a non team user`, async () => {
    // Create a fake user and add it in a random team
    const user = await createFakeUser({ type: UserType.player });

    const createdCart = await createCart(user.id, [
      {
        itemId: 'ticket-player',
        quantity: 1,
        price: (await fetchAllItems()).find((item) => item.id === 'ticket-player')!.price,
        forUserId: user.id,
      },
    ]);

    const detailedCart = await updateCart(createdCart.id, 123, TransactionState.paid);

    const cartItem = detailedCart.cartItems[0];

    const pdf = await generateTicket(cartItem);

    await fs.writeFile(`artifacts/nonteam.pdf`, pdf.content);
  });
});
