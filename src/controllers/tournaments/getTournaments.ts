import { Request, Response } from 'express';
import { fetchTournamentsWithLockedTeams } from '../../operations/tournament';
import { success } from '../../utils/responses';

export default [
  // Middlewares

  // Controller
  async (request: Request, response: Response) => {
    const result = await fetchTournamentsWithLockedTeams();
    return success(response, result);
  },
];
