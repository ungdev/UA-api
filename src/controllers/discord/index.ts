import { Router } from 'express';
import connect from './connect';
import oauth from './oauth';

const router = Router();

router.get('/oauth', oauth);
router.get('/connect', connect);

export default router;
