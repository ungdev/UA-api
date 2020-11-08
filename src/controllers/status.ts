import { Request, Response } from 'express';
import database from '../utils/database';
import { success } from '../utils/responses';

export default [
  async (request: Request, response: Response) => {
    let databaseStatus = true;

    // Try to reach the database
    try {
      await database.setting.findMany();
    } catch {
      databaseStatus = false;
    }

    return success(response, {
      http: true,
      database: databaseStatus,
    });
  },
];
