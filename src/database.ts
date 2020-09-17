import { createConnection, getConnection, Connection } from 'typeorm';
import { dbHost, dbPort, dbUsername, dbPassword, dbName } from './utils/env';
import log from './utils/log';
import DynamicEntity from './models/dynamicEntity';
import TeamModel from './models/team';
import TournamentModel from './models/tournament';
import UserModel from './models/user';
import CartModel from './models/cart';
import CartItemModel from './models/cartItem';
import ItemModel from './models/item';
import SettingModel from './models/setting';

export default async (seed = false): Promise<Connection> => {
  let connection;

  try {
    // Synchronizes and drop schema only if seed is true
    connection = await createConnection({
      type: 'mysql',
      host: dbHost(),
      port: dbPort(),
      username: dbUsername(),
      password: dbPassword(),
      database: dbName(),
      entities: [
        DynamicEntity,
        UserModel,
        TeamModel,
        TournamentModel,
        CartModel,
        ItemModel,
        CartItemModel,
        SettingModel,
      ],
      logging: true,
      synchronize: seed,
      dropSchema: seed,
    });
    log.info('Database ready');
  } catch (err) {
    log.error(err.toString()); // Winston can't sometime display error objects

    if (getConnection()) {
      getConnection().close();
    }

    process.exit(1);
  }

  return connection;
};
