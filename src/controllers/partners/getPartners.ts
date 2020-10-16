import { Request, Response } from 'express';
import { fetchPartners } from '../../operations/partners';
import { success } from '../../utils/responses';

export default [
  // Middlewares

  // Controller
  async (request: Request, response: Response) => {
    const partners = await fetchPartners();

    return success(response, partners);
  },
];
