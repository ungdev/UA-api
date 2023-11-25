import { NextFunction, Request, Response } from 'express';
import { generateBadge } from '../../utils/badge';
import { fetchUsers } from '../../operations/user';
import { User, UserSearchQuery } from '../../types';

export default [
  // Middlewares

  // Controller
  async (request: Request, response: Response, next: NextFunction) => {
    type BadgeType = 'orgas' | 'custom' | 'single' | 'singlecustom';
    type BadgePermission = 'restricted' | 'orgaprice' | 'fullaccess';
    type CommissionRole = 'respo' | 'member';

    try {
      const fields = [
        {
          "type": "orgas"
        },
        {
          "type": "custom",
          "permission": "orgaprice",
          "name": "Vieux",
          "quantity": 10
        },
        {
          "type": "single",
          "email": "noe.landre@laposte.net"
        }
      ] as {
        type: BadgeType;
        name?: string;
        permission?: BadgePermission;
        quantity?: number;
        email?: string;
        firstname?: string;
        lastname?: string;
        commissionId?: string;
        commissionRole?: CommissionRole;
      }[];

      // For orgas, get all users with the permission 'orgas' and generate a badge for each of them

      // get first user in DB and generate a badge for him
      const result = (await fetchUsers({} as UserSearchQuery, 0))[0];

      const pdf: {
        content: Buffer;
        filename: string;
      } = await generateBadge(result as unknown as User);

      // display the pdf in the browser
      response.contentType('application/pdf');
      response.send(pdf.content);

      // download the pdf
      // response.setHeader('Content-disposition', `attachment; filename=${pdf.filename}`);
      // response.send(pdf.content);
    } catch (error) {
      return next(error);
    }
  },
];
