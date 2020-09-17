import { Request, Response } from 'express';
import { success } from '../../utils/responses';
import { fetchUsers } from '../../operations/user';
import { filterUserRestricted } from '../../utils/filters';

export default [
  // Middlewares

  // Controller
  async (req: Request, res: Response): Promise<void> => {
    const users = await fetchUsers();

    const result = users.map(filterUserRestricted);

    return success(res, result);
  },
];
