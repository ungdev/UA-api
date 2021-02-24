import { Router } from 'express';
import forcePay from './forcePay';

const router = Router();

router.post('/:userId/force-pay', forcePay);

export default router;
