import { Router } from 'express';
import tournaments from './tournaments';
import { status, contact } from './general';
import users from './users';
import auth from './auth';

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

  // Authentication routes
  router.use('/auth', auth());

  return router;
};

export default routes;
