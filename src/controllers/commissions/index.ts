import { Router } from 'express';

import getCommissions from './getCommissions';

const router = Router();

router.get('/', getCommissions);

export default router;
