import { NextFunction, Request, Response } from 'express';
import { hasPermission } from '../../../middlewares/authentication';
import { Permission } from '../../../types';
import { success } from '../../../utils/responses';
import { getPaidAndValidatedUsers } from '../../../operations/user';

export default [
  // Middlewares
  ...hasPermission(Permission.entry),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const paidAndValidatedPlayers = await getPaidAndValidatedUsers();

      return success(response, {
        alreadyScanned: paidAndValidatedPlayers.filter((player) => player.scannedAt).length,
        totalToScan: paidAndValidatedPlayers.length,
      });
    } catch (error) {
      return next(error);
    }
  },
];
