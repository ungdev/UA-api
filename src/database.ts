import 'reflect-metadata'; // Do not delete this line !
import { createConnection, getConnection } from 'typeorm';
import { User } from './models/user';
import { dbHost, dbPort, dbUsername, dbPassword, dbName } from './utils/env';
import { DynamicEntity } from './models/dynamicEntity';
import { Team } from './models/team';
import { Tournament } from './models/tournament';
import Cart from './models/cart';
import { CartItem } from './models/cartItem';
import { Item } from './models/item';
import log from './utils/log';

export default async (seed = false) => {
  try {
    // Synchronizes and drop schema only if seed is true
    const connection = await createConnection({
      type: 'mysql',
      host: dbHost(),
      port: dbPort(),
      username: dbUsername(),
      password: dbPassword(),
      database: dbName(),
      entities: [DynamicEntity, User, Team, Tournament, Cart, Item, CartItem],
      synchronize: seed,
      logging: true,
      dropSchema: seed,
    });
    log.info('Database ready');

    return connection;
  } catch (err) {
    log.error(err.toString()); // Winston can't sometime display error objects

    if (getConnection()) {
      getConnection().close();
    }

    process.exit(1);
    return null;
  }
};
