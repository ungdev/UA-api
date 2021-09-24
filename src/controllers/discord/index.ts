import { Router } from 'express';
import connect from './connect';
import oauth from './oauth';
import syncRoles from './syncRoles';

const router = Router();

router.get('/oauth', oauth);
router.get('/connect', connect);
router.get('/discord/sync-roles', syncRoles);

export default router;
