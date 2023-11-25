import { Router } from 'express';
// import generateAllBadges from './generateAllBadges';
import generateBadge from './generateBadge';

const router = Router();

router.get('/', generateBadge);
// router.get('/all', generateAllBadges);

export default router;
