import { NextFunction, Request, Response } from 'express';
import { fetchOrgas } from '../../operations/user';
import { success } from '../../utils/responses';

export default [
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const orgas = await fetchOrgas();
      /* const result = Object.fromEntries(
        Object.keys(Commission).map((commission) => [
          commission,
          Object.fromEntries<Array<{ id: string; firstname: string; lastname: string }>>(
            Object.keys(RoleInCommission).map((role) => [role, []]),
          ),
        ]),
      );
      for (const orga of orgas) {
        for (const role of orga.orgaRoles) {
          result[role.commissionRole][role.commission].push(orga);
        }
      }*/
      const result = orgas.map((orga) => ({
        id: orga.id,
        firstname: orga.firstname,
        lastname: orga.lastname,
        commissions: Object.fromEntries(orga.orgaRoles.map((role) => [role.commission, role.commissionRole])),
      }));
      return success(response, result);
    } catch (error) {
      return next(error);
    }
  },
];
