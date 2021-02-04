import { Router } from 'express';
import swagger from 'swagger-ui-express';

import swaggerDocument from '../../openapi.json';
import status from './status';
import contact from './contact';
import settings from './settings';
import users from './users';
import tournaments from './tournaments';
import items from './items';
import teams from './teams';
import auth from './auth';
import callbacks from './callbacks';

const router = Router();

// To match only with root
router.get('//', status);

// Settings route
router.get('/settings', settings);

// Contact routes
router.post('/contact', contact);

// Auth routes
router.use('/auth', auth);

// Documentation
router.use('/docs', swagger.serve, swagger.setup(swaggerDocument));

// Users route
router.use('/users', users);

// Team routes
router.use('/teams', teams);

// Tournaments routes
router.use('/tournaments', tournaments);

// Items routes
router.use('/items', items);

// Callbacks routes
router.use('/callbacks', callbacks);

export default router;
