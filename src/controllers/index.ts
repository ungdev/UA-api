import { Router } from 'express';
import swagger from 'swagger-ui-express';

import swaggerDocument from '../../openapi.json';
import status from './status';
import contact from './contact';
import settings from './settings';
import tournaments from './tournaments';
import users from './users';
import auth from './auth';

const routes = (): Router => {
  const router = Router();

  // To match only with root
  router.get('//', status);

  // Settings route
  router.get('/settings', settings);

  // Contact route
  router.post('/contact', contact);

  // Documentation
  router.use('/docs', swagger.serve, swagger.setup(swaggerDocument));

  // Users routes
  router.use('/users', users());

  // Tournaments routes
  router.use('/tournaments', tournaments());

  // Authentication routes
  router.use('/auth', auth());

  return router;
};

export default routes;
