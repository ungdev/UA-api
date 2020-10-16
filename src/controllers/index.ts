import { Router } from 'express';
import { status, contact } from './general';
import partners from './partners';
import users from './users';
import tournaments from './tournaments';

const routes = (): Router => {
  const router = Router();

  // To match only with root
  router.get('//', status);

  // Contact route
  router.post('/contact', contact);

  // Partners routes
  router.use('/partners', partners());

  // Users routes
  router.use('/users', users());

  // Tournaments route
  router.use('/tournaments', tournaments());

  return router;
};

export default routes;
