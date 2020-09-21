import { Router } from 'express';
import getUser from './getUser';

export default (): Router => {
  const router = Router();

  router.get('/', getUser);

  return router;
};
