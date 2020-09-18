import { Request, Response } from 'express';
import { User } from '@prisma/client';
import { success } from '../../utils/responses';
import { fetchUsers } from '../../operations/user';
import { filterUserRestricted } from '../../utils/filters';

export default [
  // Middlewares

  // Controller
  async (req: Request, res: Response) => {
    const users: User[] = await fetchUsers();
    const result = users.map(filterUserRestricted);

    return success(res, result);
  },
];
