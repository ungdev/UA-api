/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'fs/promises';
import { TournamentId, TransactionState } from '@prisma/client';
import { createFakeTeam, createFakeUser } from '../utils';
import { createCart, updateCart } from '../../src/operations/carts';
import { generateTicket } from '../../src/utils/pdf';
import { getCaptain } from '../../src/utils/teams';
import database from '../../src/services/database';

describe('Tests the PDF utils', () => {
  after(async () => {
    await database.team.deleteMany();
    await database.cartItem.deleteMany();
    await database.cart.deleteMany();
    await database.user.deleteMany();
  });

  for (const tournamentId in TournamentId) {
    it(`should generate a PDF ticket for ${tournamentId}`, async () => {
      // Create a fake user and add it in a random team
      const team = await createFakeTeam({ tournament: tournamentId as TournamentId });
      const user = getCaptain(team);

      const createdCart = await createCart(user.id, [{ itemId: 'ticket-player', quantity: 1, forUserId: user.id }]);

      const detailedCart = await updateCart(createdCart.id, 123, TransactionState.paid);

      const cartItem = detailedCart.cartItems[0];

      const pdf = await generateTicket(cartItem);

      await fs.writeFile(`artifacts/${tournamentId}.pdf`, pdf.content);
    });
  }

  it(`should generate a PDF ticket for a non team user`, async () => {
    // Create a fake user and add it in a random team
    const user = await createFakeUser();

    const createdCart = await createCart(user.id, [{ itemId: 'ticket-player', quantity: 1, forUserId: user.id }]);

    const detailedCart = await updateCart(createdCart.id, 123, TransactionState.paid);

    const cartItem = detailedCart.cartItems[0];

    const pdf = await generateTicket(cartItem);

    await fs.writeFile(`artifacts/nonteam.pdf`, pdf.content);
  });
});
