import { Request, Response } from 'express';
import { success } from '../../utils/responses';

export default [
  // Middlewares

  // Controller
  (request: Request, response: Response) => {
    // const users: User[] = await fetchUsers();
    // const result = users.map(filterUserRestricted);

    return success(response, 'mange tes grands morts');
  },
];
