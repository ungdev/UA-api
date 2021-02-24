import { Router } from 'express';
import forcePay from './forcePay';
import getCarts from './getCarts';

const router = Router();

router.get('/:userId/carts', getCarts);
router.post('/:userId/force-pay', forcePay);

export default router;
