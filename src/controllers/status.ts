import { Request, Response } from 'express';
import { success } from '../utils/responses';

export default () => (req: Request, res: Response): void => {
  return success(res, { login: true, shop: true });
};
