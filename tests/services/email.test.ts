import { SMTPServer, SMTPServerAddress, SMTPServerSession } from 'smtp-server';
import fs from 'fs/promises';
import mangetesmorts from 'fs';
import { ItemCategory, TournamentId, TransactionState, UserType } from '@prisma/client';
import { createFakeTeam, createFakeUser } from '../utils';
import { DetailedCart, DetailedCartItem, PrimitiveCartItem } from '../../src/types';
import { createCart, fetchCart, updateCart } from '../../src/operations/carts';
import { generatePayementHtml, sendEmail, sendTickets } from '../../src/services/email';
import { randomInt } from '../../src/utils/helpers';
import { getCaptain } from '../../src/utils/teams';
import { fetchItems } from '../../src/operations/item';
import env from '../../src/utils/env';
import { expect } from 'chai';
import { address } from 'faker';
import { sandbox } from '../setup';

describe('Tests the email utils', () => {
  it('test sendEmail function by using an SMTP server', async () => {
    // Create a fake SMTP server
    const server = new SMTPServer({
      secure: false,
      authOptional: true,
      onMailFrom: (address, session, callback) => {
        try {
          // Checks that the send email is the same corresponding from the environment variables
          expect(address.address).to.be.equal(env.email.sender.address);
          return callback();
        } catch (error) {
          return callback(error);
        }
      },
      onRcptTo: (address, session, callback) => {
        try {
          // Check if the destination adress is corresponding to the one who has been sent
          expect(address.address).to.be.equal('bonjour@lol.fr');
          return callback();
        } catch (error) {
          return callback(error);
        }
      },
      onData: (stream, session, callback) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => {
          const message = Buffer.concat(chunks).toString();

          // Check if the object is there
          expect(message).to.contain("Subject: je kiffe l'ua");

          // Check if html is there
          expect(message).to.contain('<html>hello world !</html>');

          // Check if the attachement is there
          expect(message).to.contain('Content-Type: application/octet-stream; name=random.dat');
          return callback();
        });
        stream.on('error', () => callback(new Error('A stream error occured')));
      },
    });

    server.listen(env.email.port);

    await sendEmail('bonjour@lol.fr', "je kiffe l'ua", '<html>hello world !</html>', [
      { filename: 'random.dat', content: Buffer.from([255]) },
    ]);

    server.close();
  });

  // We also use this test to have a preview of the email generated in the artifacts
  it.skip(`should generate a payment template`, async () => {
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
