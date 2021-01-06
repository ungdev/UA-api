import { Request, Response } from 'express';
import { fetchItems } from '../../operations/item';
import { success } from '../../utils/responses';

export default [
  // Middlewares

  // Controller
  async (request: Request, response: Response) => {
    const result = await fetchItems();
    return success(response, result);
  },
];
