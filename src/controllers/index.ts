import { Router } from 'express';
import tournaments from './tournaments';
import { status, contact } from './general';
import users from './users';

const routes = (): Router => {
  const router = Router();

  // To match only with root
  router.get('//', status);

  // Users routes
  router.use('/users', users());

  // Tournaments route
  router.use('/tournaments', tournaments());

  // Route contact
  router.post('/contact', contact);

  return router;
};

export default routes;
