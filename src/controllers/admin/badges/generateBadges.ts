/* eslint-disable no-fallthrough */
import { NextFunction, Request, Response } from 'express';
import { generateBadge } from '../../../utils/badge';
import { Badge, BadgeField, Error, Permission } from '../../../types';
import database from '../../../services/database';
import { badRequest, notFound } from '../../../utils/responses';
import env from '../../../utils/env';
import { hasPermission } from '../../../middlewares/authentication';

const getCommisionPermission = (commissionRole: string, commissionId: string) => {
  switch (commissionId) {
    case 'vieux': {
      return 'invite';
    }

    case 'coord': {
      return 'fullaccess';
    }

    case 'security': {
      return 'fullaccess';
    }

    case 'logistique': {
      if (commissionRole === 'respo') return 'fullaccess';
    }

    case 'rozo': {
      if (commissionRole === 'respo') return 'fullaccess';
    }

    case 'electricity': {
      if (commissionRole === 'respo') return 'fullaccess';
    }

    default: {
      return 'orgaprice';
    }
  }
};

const getCommissionName = (commissionRole: string, commissionId: string, commissionName: string) => {
  if (commissionId === 'coord' && commissionRole === 'respo') return 'Présidente';

  if (commissionRole === 'respo') return `Respo ${commissionName}`;
  return commissionName;
};

export default [
  // Middlewares
  ...hasPermission(Permission.admin),

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      // Check if the body is correct
      if (!request.body.fields || !Array.isArray(request.body.fields)) {
        return badRequest(response, Error.InvalidBody);
      }

      let hasError = false;

      const listBadgeToGenerate = [] as Badge[];

      // Generate the list of badges to generate
      for (const field of request.body.fields as BadgeField[]) {
        if (hasError) return false;
        switch (field.type) {
          case 'orgas': {
            await database.user
              .findMany({
                orderBy: {
                  firstname: 'desc',
                },
                where: {
                  permissions: { contains: 'orga' },
                },
                include: {
                  orga: {
                    include: {
                      roles: { select: { commission: true, commissionRole: true } },
                    },
                  },
                },
              })
              .then((users) => {
                for (const user of users) {
                  if (!user.orga || user.orga.roles.length === 0) continue;
                  let mainCommissionIndex = user.orga.roles.findIndex(
                    (role) => role.commission.id === user.orga.mainCommissionId,
                  );

                  mainCommissionIndex = mainCommissionIndex === -1 ? 0 : mainCommissionIndex;

                  listBadgeToGenerate.push({
                    type: getCommisionPermission(
                      user.orga.roles[mainCommissionIndex].commissionRole,
                      user.orga.roles[mainCommissionIndex].commission.id,
                    ),
                    firstName: user.firstname,
                    lastName: user.lastname,
                    image: user.orga.photoFilename
                      ? `${env.front.website}/uploads/files/orga/${user.orga.photoFilename}.webp`
                      : '',
                    commissionName: getCommissionName(
                      user.orga.roles[mainCommissionIndex].commissionRole,
                      user.orga.roles[mainCommissionIndex].commission.id,
                      user.orga.roles[mainCommissionIndex].commission.nameOnBadge,
                    ),
                    place: user.place,
                    firstaid: !!user.permissions.includes('firstaid'),
                  });
                }
              });
            break;
          }

          case 'custom': {
            for (let index = 0; index < field.quantity; index++) {
              listBadgeToGenerate.push({
                type: field.permission ?? 'restricted',
                firstName: '',
                lastName: '',
                image: '',
                commissionName: field.name ?? '',
              });
            }
            break;
          }

          case 'single': {
            await database.user
              .findMany({
                where: {
                  email: field.email,
                  permissions: { contains: 'orga' },
                },
                include: {
                  orga: {
                    include: {
                      roles: { select: { commission: true, commissionRole: true } },
                    },
                  },
                },
              })
              .then((user) => {
                if (user.length === 0) {
                  hasError = true;
                  notFound(response, `User (${field.email}) not found` as Error);
                  return;
                }

                const mainCommissionIndex = user[0].orga.roles.findIndex(
                  (role) => role.commission.id === user[0].orga.mainCommissionId,
                );

                listBadgeToGenerate.push({
                  type: getCommisionPermission(
                    user[0].orga.roles[mainCommissionIndex].commissionRole,
                    user[0].orga.roles[mainCommissionIndex].commission.id,
                  ),
                  firstName: user[0].firstname,
                  lastName: user[0].lastname,
                  image: `${env.front.website}/uploads/files/orga/${user[0].orga.photoFilename}.webp`,
                  firstaid: !!user[0].permissions.includes('firstaid'),
                  commissionName: getCommissionName(
                    user[0].orga.roles[mainCommissionIndex].commissionRole,
                    user[0].orga.roles[mainCommissionIndex].commission.id,
                    user[0].orga.roles[mainCommissionIndex].commission.nameOnBadge,
                  ),
                });
              });
            break;
          }

          case 'singlecustom': {
            listBadgeToGenerate.push({
              type: field.permission,
              firstName: field.firstname ?? '',
              lastName: field.lastname ?? '',
              image: field.image ?? '',
              commissionName: field.commissionId,
              place: field.place,
            });
            break;
          }

          default: {
            return badRequest(response, Error.InvalidBody);
          }
        }
      }

      if (hasError) return false;

      const pdf: {
        content: Buffer;
        filename: string;
      } = await generateBadge(listBadgeToGenerate);

      // display the pdf in the browser
      response.contentType('application/pdf');
      return response.send(pdf.content);
    } catch (error) {
      return next(error);
    }
  },
];
