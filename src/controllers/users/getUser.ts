import { Request, Response } from 'express';
import { isAuthenticated } from '../../middlewares/authentication';
import { success } from '../../utils/responses';

export default [
  // Middlewares
  ...isAuthenticated,

  // Controller
  (request: Request, response: Response) =>
    // const users: User[] = await fetchUsers();
    // const result = users.map(filterUserRestricted);

    success(response, 'mange tes grands morts'),
];
