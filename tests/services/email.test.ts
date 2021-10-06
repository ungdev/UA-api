import fs from 'fs';
import { SMTPServer } from 'smtp-server';
import { ItemCategory, TransactionState, UserType } from '@prisma/client';
import { expect } from 'chai';
import { createFakeUser } from '../utils';
import { PrimitiveCartItem } from '../../src/types';
import { createCart, updateCart } from '../../src/operations/carts';
import { sendEmail } from '../../src/services/email';
import { inflate } from '../../src/services/email/components';
import {
  generateTicketsEmail,
  generatePasswordResetEmail,
  generateValidationEmail,
} from '../../src/services/email/serializer';
import { randomInt } from '../../src/utils/helpers';
import { fetchAllItems } from '../../src/operations/item';
import env from '../../src/utils/env';
import database from '../../src/services/database';
import { generateResetToken } from '../../src/operations/user';

describe('Tests the email utils', () => {
  after(async () => {
    await database.cart.deleteMany();
    await database.user.deleteMany();
  });

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

          return callback();
        });
        stream.on('error', () => callback(new Error('A stream error occured')));
      },
    });

    server.listen(env.email.uri.match(/:(\d+)/)[1]);

    await sendEmail({
      to: 'bonjour@lol.fr',
      subject: "je kiffe l'ua",
      html: '<html>hello world !</html>',
    });

    server.close();
  });

  // We also use this test to have a preview of the email generated in the artifacts
  it(`should generate a payment template`, async () => {
    // Create a fake user and add it in a random team
    const user = await createFakeUser();
    const spectator = await createFakeUser({ type: UserType.spectator });
    const coach = await createFakeUser({ type: UserType.coach });

    const items = await fetchAllItems();
    const supplements = items.filter((item) => item.category === ItemCategory.supplement);

    // Generate a cart item for each supplement
    const supplementsCartItems: PrimitiveCartItem[] = supplements.map((supplement) => ({
      itemId: supplement.id,
      quantity: randomInt(1, 5),
      forUserId: user.id,
    }));

    const createdCart = await createCart(user.id, [
      { itemId: 'ticket-player', quantity: 1, forUserId: user.id },
      { itemId: 'ticket-spectator', quantity: 1, forUserId: spectator.id },
      { itemId: 'ticket-coach', quantity: 1, forUserId: coach.id },
      ...supplementsCartItems,
    ]);

    const detailedCart = await updateCart(createdCart.id, 123, TransactionState.paid);

    const ticketsEmail = await generateTicketsEmail(detailedCart);

    fs.writeFileSync('artifacts/payment.html', ticketsEmail.html);
  });

  it(`should generate an account validation template`, async () => {
    const user = await createFakeUser({ confirmed: false });

    const validationEmail = await generateValidationEmail(user);

    fs.writeFileSync('artifacts/validation.html', validationEmail.html);
  });

  it(`should generate a password reset template`, async () => {
    let user = await createFakeUser();
    user = {
      ...(await generateResetToken(user.id)),
      cartItems: [],
      hasPaid: false,
    };

    const passwordResetEmail = await generatePasswordResetEmail(user);

    fs.writeFileSync('artifacts/pwd-reset.html', passwordResetEmail.html);
  });

  describe('Test mail serialization', () => {
    it('should not generate table when dataset is empty', () => {
      expect(
        inflate({
          items: [],
        }),
      ).to.be.equal('');
    });

    it('should not generate table name when undefined', () => {
      expect(
        inflate({
          items: [
            {
              test: 'This is a test',
            },
            {
              test: 'A random row',
            },
          ],
        }),
      ).to.be.match(/^<tr><td></);
    });

    it('should not generate table when empty', () => {
      expect(
        inflate({
          items: [
            {
              test: 'This is a test',
            },
          ],
        }),
      ).to.be.equal('');
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    it('should throw an error if component is invalid', () => expect(() => inflate(<any>{})).to.throw());
  });
});
