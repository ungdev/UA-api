import { Router } from 'express';
import generateBadge from './generateBadge';

const router = Router();

router.post('/', generateBadge);

export default router;
