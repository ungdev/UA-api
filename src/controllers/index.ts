import { Router } from 'express';
import swagger from 'swagger-ui-express';

import swaggerDocument from '../../openapi.json';
import root from './root';
import users from './users';
import tournaments from './tournaments';
import items from './items';
import teams from './teams';
import auth from './auth';
import tickets from './tickets';
import callbacks from './callbacks';
import admin from './admin';

const router = Router();

// Root routes
router.use(root);

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

// Tickets routes
router.use('/tickets', tickets);

// Callbacks routes
router.use('/callbacks', callbacks);

// Admin routes
router.use('/admin', admin);

export default router;
