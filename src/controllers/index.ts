import { Router } from 'express';
import status from './status';
import users from './users';

const routes = (): Router => {
  const router = Router();

  // To match only with root
  router.get('//', status);

  // Users routes
  router.use('/users', users());

  return router;
};

export default routes;
