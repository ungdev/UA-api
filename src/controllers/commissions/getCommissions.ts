import { Request, NextFunction, Response } from 'express';
import { success } from '../../utils/responses';
import { fetchCommissions } from '../../operations/commission';

export default [
  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const commissions = await fetchCommissions();

      return success(
        response,
        commissions.map((commission) => ({
          id: commission.id,
          name: commission.name,
          color: commission.color,
          masterCommission: commission.masterCommissionId,
        })),
      );
    } catch (error) {
      return next(error);
    }
  },
];
