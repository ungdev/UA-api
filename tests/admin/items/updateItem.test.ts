import { expect } from 'chai';
import request from 'supertest';
import { Item, ItemCategory, TransactionState } from '@prisma/client';
import app from '../../../src/app';
import { createFakeCart, createFakeItem, createFakeUser } from '../../utils';
import database from '../../../src/services/database';
import { Error, Permission, User, UserType } from '../../../src/types';
import { generateToken } from '../../../src/utils/users';
import { sandbox } from '../../setup';
import * as itemOperations from '../../../src/operations/item';

describe('PATCH /admin/items/:itemId', () => {
  let user: User;
  let admin: User;
  let item: Item;
  let adminToken: string;
  let validBody: {
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
  };

  before(async () => {
    item = await createFakeItem({
      name: 'Chocapic',
      stock: 12,
      availableFrom: new Date(1970, 1, 1),
      availableUntil: new Date(1971, 1, 1),
    });
    user = await createFakeUser({ type: UserType.player });
    // Buy this item. Buy it once per transaction state, to test them all
    await Promise.all(
      (['paid', 'pending', 'refunded', 'expired'] as TransactionState[]).map((transactionState) =>
        createFakeCart({
          userId: user.id,
          transactionState,
          items: [{ itemId: item.id, price: item.price, quantity: 1 }],
        }),
      ),
    );
    admin = await createFakeUser({ permissions: [Permission.admin], type: UserType.player });
    adminToken = generateToken(admin);
    validBody = {
      name: 'Miel pops',
      category: 'rent',
      attribute: 'family-size',
      price: 2000,
      reducedPrice: 1500,
      infos: 'A big pack of miel pops for big families :)',
      image: 'https://https://picsum.photos/200',
      stockDifference: 18,
      availableFrom: new Date(Date.now()),
      availableUntil: new Date(Date.now() + 1000),
    };
  });

  after(async () => {
    await database.cart.deleteMany();
    // Delete the user created
    await database.orga.deleteMany();
    await database.user.deleteMany();
    await database.item.delete({ where: { id: item.id } });
  });

  it('should error as the user is not authenticated', () =>
    request(app).patch(`/admin/items/${item.id}`).expect(401, { error: Error.Unauthenticated }));

  it('should error as the user is not an administrator', () => {
    const userToken = generateToken(user);
    return request(app)
      .patch(`/admin/items/${item.id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403, { error: Error.NoPermission });
  });

  it('should error as the item is not found', () =>
    request(app)
      .patch(`/admin/items/POTATO`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody)
      .expect(404, { error: Error.ItemNotFound }));

  it('should not change anything', async () => {
    const { body } = await request(app)
      .patch(`/admin/items/${item.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);

    // Check body response
    expect(body.id).to.be.equal(item.id);
    expect(body.name).to.be.equal(item.name);
    expect(body.category).to.be.equal(item.category);
    expect(body.attribute).to.be.equal(item.attribute);
    expect(body.price).to.be.equal(item.price);
    expect(body.reducedPrice).to.be.equal(item.reducedPrice);
    expect(body.infos).to.be.equal(item.infos);
    expect(body.image).to.be.equal(item.image);
    expect(body.stock).to.be.equal(item.stock);
    expect(body.left).to.be.equal(item.stock - 2); // Only 2 carts should count as bought
    expect(body.availableFrom).to.be.equal(item.availableFrom.toISOString());
    expect(body.availableUntil).to.be.equal(item.availableUntil.toISOString());

    // Check it hasn't been modified in the database
    const itemDatabase = await database.item.findUnique({ where: { id: item.id } });
    expect(itemDatabase.name).to.be.equal(item.name);
    expect(itemDatabase.category).to.be.equal(item.category);
    expect(itemDatabase.attribute).to.be.equal(item.attribute);
    expect(itemDatabase.price).to.be.equal(item.price);
    expect(itemDatabase.reducedPrice).to.be.equal(item.reducedPrice);
    expect(itemDatabase.infos).to.be.equal(item.infos);
    expect(itemDatabase.image).to.be.equal(item.image);
    expect(itemDatabase.stock).to.be.equal(item.stock);
    expect(itemDatabase.availableFrom.getTime()).to.be.equal(item.availableFrom.getTime());
    expect(itemDatabase.availableUntil.getTime()).to.be.equal(item.availableUntil.getTime());
  });

  it('should fail with an internal server error', async () => {
    sandbox.stub(itemOperations, 'updateAdminItem').throws('Unexpected error');

    await request(app)
      .patch(`/admin/items/${item.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody)
      .expect(500, { error: Error.InternalServerError });
  });

  it('should modify the item entirely', async () => {
    const { body } = await request(app)
      .patch(`/admin/items/${item.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validBody)
      .expect(200);

    // Check body response
    expect(body.id).to.be.equal(item.id);
    expect(body.name).to.be.equal(validBody.name);
    expect(body.category).to.be.equal(validBody.category);
    expect(body.attribute).to.be.equal(validBody.attribute);
    expect(body.price).to.be.equal(validBody.price);
    expect(body.reducedPrice).to.be.equal(validBody.reducedPrice);
    expect(body.infos).to.be.equal(validBody.infos);
    expect(body.image).to.be.equal(validBody.image);
    expect(body.stock).to.be.equal(validBody.stockDifference + item.stock);
    expect(body.left).to.be.equal(validBody.stockDifference + item.stock - 2); // Only 2 carts should count as bought
    expect(body.availableFrom).to.be.equal(validBody.availableFrom.toISOString());
    expect(body.availableUntil).to.be.equal(validBody.availableUntil.toISOString());

    // Check it has been modified in the database
    const itemDatabase = await database.item.findUnique({ where: { id: item.id } });
    expect(itemDatabase.name).to.be.equal(validBody.name);
    expect(itemDatabase.category).to.be.equal(validBody.category);
    expect(itemDatabase.attribute).to.be.equal(validBody.attribute);
    expect(itemDatabase.price).to.be.equal(validBody.price);
    expect(itemDatabase.reducedPrice).to.be.equal(validBody.reducedPrice);
    expect(itemDatabase.infos).to.be.equal(validBody.infos);
    expect(itemDatabase.image).to.be.equal(validBody.image);
    expect(itemDatabase.stock).to.be.equal(validBody.stockDifference + item.stock);
    expect(itemDatabase.availableFrom.getTime()).to.be.equal(validBody.availableFrom.getTime());
    expect(itemDatabase.availableUntil.getTime()).to.be.equal(validBody.availableUntil.getTime());
  });
});
