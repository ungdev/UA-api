import { Router } from 'express';
import forcePay from './forcePay';
import getCarts from './getCarts';
import getUsers from './getUsers';

const router = Router();

router.get('//', getUsers);
router.get('/:userId/carts', getCarts);
router.post('/:userId/force-pay', forcePay);

export default router;
