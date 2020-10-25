import { Router } from 'express';
import status from './status';
import contact from './contact';
import settings from './settings';
import users from './users';
import tournaments from './tournaments';

const routes = (): Router => {
  const router = Router();

  // To match only with root
  router.get('//', status);

  // Settings route
  router.get('/settings', settings);

  // Contact route
  router.post('/contact', contact);

  // Users routes
  router.use('/users', users());

  // Tournaments routes
  router.use('/tournaments', tournaments());

  return router;
};

export default routes;
