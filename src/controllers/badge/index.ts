import { Router } from 'express';
import generateBadge from './generateBadge';

const router = Router();

router.get('/', generateBadge);

export default router;
