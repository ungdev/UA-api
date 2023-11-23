import { NextFunction, Request, Response } from 'express';
import { fetchOrgas } from '../../operations/user';
import { forbidden, success } from '../../utils/responses';
import database from '../../services/database';
import { fetchSetting } from '../../operations/settings';
import { Error } from '../../types';

export default [
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      if (!(await fetchSetting('trombi')).value) return forbidden(response, Error.TrombiNotAllowed);
      const orgas = await fetchOrgas();
      const commissions = await database.commission.findMany();
      const resultInObject = Object.fromEntries(
        commissions.map((commission) => [
          commission.id,
          {
            id: commission.id,
            name: commission.name,
            position: commission.position,
            color: commission.color,
            masterCommission: commission.masterCommissionId,
            roles: { respo: [], member: [] },
          },
        ]),
      );
      for (const orga of orgas) {
        for (const role of orga.roles) {
          resultInObject[role.commission.id].roles[role.commissionRole].push({
            id: orga.id,
            name: orga.name,
            username: orga.username,
            photoFilename: orga.photoFilename,
          });
        }
      }
      return success(
        response,
        Object.values(resultInObject)
          // Remove empty commissions
          .filter((commission) => commission.roles.respo.length > 0 || commission.roles.member.length > 0)
          .sort((commission1, commission2) => commission1.position - commission2.position)
          .map((commission) => {
            const commissionWithoutPosition = { ...commission };
            delete commissionWithoutPosition.position;
            return commissionWithoutPosition;
          }),
      );
    } catch (error) {
      return next(error);
    }
  },
];
