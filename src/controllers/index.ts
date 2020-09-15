import { Router } from 'express';
import status from './status';

const routes = (): Router => {
  const router = Router();

  // To match only with root
  router.use('//', status());

  return router;
};

export default routes;
