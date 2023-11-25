/* eslint-disable no-fallthrough */
import { NextFunction, Request, Response } from 'express';
import { generateBadge } from '../../../utils/badge';
import { Badge, BadgeField, Error, Permission } from '../../../types';
import database from '../../../services/database';
import { notFound } from '../../../utils/responses';
import env from '../../../utils/env';
import { hasPermission } from '../../../middlewares/authentication';

const getCommisionPermission = (commissionRole: string, commissionId: string) => {
  switch (commissionId) {
    case 'vieux': {
      return 'restricted';
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

    case 'ssl': {
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
        return notFound(response, Error.InvalidBody);
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
                  listBadgeToGenerate.push({
                    type: getCommisionPermission(user.orga.roles[0].commissionRole, user.orga.roles[0].commission.id),
                    firstName: user.firstname,
                    lastName: user.lastname,
                    // TODO: change URL
                    image: user.orga.photoFilename
                      ? `${env.front.website}/uploads/files/orga/${user.orga.photoFilename}.webp`
                      : '',
                    commissionName: getCommissionName(
                      user.orga.roles[0].commissionRole,
                      user.orga.roles[0].commission.id,
                      user.orga.roles[0].commission.name,
                    ),
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
                // TODO: change URL
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

                listBadgeToGenerate.push({
                  type: getCommisionPermission(
                    user[0].orga.roles[0].commissionRole,
                    user[0].orga.roles[0].commission.id,
                  ),
                  firstName: user[0].firstname,
                  lastName: user[0].lastname,
                  // TODO: change URL
                  image: `${env.front.website}/uploads/files/orga/${user[0].orga.photoFilename}.webp` ?? '',
                  commissionName: getCommissionName(
                    user[0].orga.roles[0].commissionRole,
                    user[0].orga.roles[0].commission.id,
                    user[0].orga.roles[0].commission.name,
                  ),
                });
              });
            break;
          }

          case 'singlecustom': {
            listBadgeToGenerate.push({
              type: getCommisionPermission(field.commissionRole ?? 'member', field.commissionId ?? 'vieux'),
              firstName: field.firstname ?? '',
              lastName: field.lastname ?? '',
              // TODO: change URL
              image: '',
              commissionName: await database.commission
                .findUnique({
                  where: { id: field.commissionId ?? 'vieux' },
                  select: { name: true },
                })
                .then((commission) =>
                  getCommissionName(field.commissionRole ?? 'member', field.commissionId ?? 'vieux', commission.name),
                ),
            });
            break;
          }

          default: {
            break;
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
