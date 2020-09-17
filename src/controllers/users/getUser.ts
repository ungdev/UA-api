import { Request, Response } from 'express';
import { success } from '../../utils/responses';
import { fetchUsers } from '../../operations/user';

export default async (req: Request, res: Response) => {
  const users = await fetchUsers();

  const result = users;

  return success(res, result);
};
