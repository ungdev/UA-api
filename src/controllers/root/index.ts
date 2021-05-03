import { Router } from 'express';

import status from './status';
import settings from './settings';
import contact from './contact';

const router = Router();

// To match only with root
router.get('//', status);

// Settings route
router.get('/settings', settings);

// Contact routes
router.post('/contact', contact);

export default router;
