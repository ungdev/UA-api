import fs from 'fs';
import { SMTPServer } from 'smtp-server';
import { expect } from 'chai';
import { createFakeUser } from '../utils';
import { PrimitiveCartItem, ItemCategory, TransactionState, UserType } from '../../src/types';
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
    await database.orga.deleteMany();
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

          // Check if the attachement is there
          expect(message).to.contain('Content-Type: application/octet-stream; name=random.dat');
          return callback();
        });
        stream.on('error', () => callback(new Error('A stream error occured')));
      },
    });

    server.listen(env.email.uri.match(/:(\d+)/)[1]);

    await sendEmail(
      {
        to: 'bonjour@lol.fr',
        subject: "je kiffe l'ua",
        html: '<html>hello world !</html>',
      },
      [{ filename: 'random.dat', content: Buffer.from([255]) }],
    );

    server.close();
  });

  // We also use this test to have a preview of the email generated in the artifacts
  it(`should generate a payment template`, async () => {
    // Create a fake user and add it in a random team
    const user = await createFakeUser({ type: UserType.player });
    const spectator = await createFakeUser({ type: UserType.spectator });
    const coach = await createFakeUser({ type: UserType.coach });

    const items = await fetchAllItems();
    const supplements = items.filter((item) => item.category === ItemCategory.supplement);

    // Generate a cart item for each supplement
    const supplementsCartItems: PrimitiveCartItem[] = await Promise.all(
      supplements.map(async (supplement) => ({
        itemId: supplement.id,
        quantity: randomInt(1, 5),
        price: (await fetchAllItems()).find((item) => item.id === 'ticket-player').price,
        forUserId: user.id,
      })),
    );

    const createdCart = await createCart(user.id, [
      {
        itemId: 'ticket-player',
        quantity: 1,
        price: (await fetchAllItems()).find((item) => item.id === 'ticket-player').price,
        forUserId: user.id,
      },
      {
        itemId: 'ticket-spectator',
        quantity: 1,
        price: (await fetchAllItems()).find((item) => item.id === 'ticket-spectator').price,
        forUserId: spectator.id,
      },
      {
        itemId: 'ticket-coach',
        quantity: 1,
        price: (await fetchAllItems()).find((item) => item.id === 'ticket-coach').price,
        forUserId: coach.id,
      },
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
    const user = await createFakeUser({ type: UserType.player });
    user.resetToken = (await generateResetToken(user.id)).resetToken;

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
