import { Router } from 'express';
import status from './status';
import tournaments from './tournaments';
import users from './users';

const routes = (): Router => {
  const router = Router();

  // To match only with root
  router.get('//', status);

  // Users routes
  router.use('/users', users());

  // Tournaments route
  router.use('/tournaments', tournaments());

  return router;
};

export default routes;
