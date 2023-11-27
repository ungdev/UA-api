import { Router } from 'express';
import generateBadges from './generateBadges';

const router = Router();

router.post('/', generateBadges);

export default router;
