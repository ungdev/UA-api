import { Router } from 'express';
import forcePay from './forcePay';
import getCarts from './getCarts';
import getUsers from './getUsers';
import updateUser from './updateUser';

const router = Router();

router.get('//', getUsers);
router.put('/:userId', updateUser);
router.get('/:userId/carts', getCarts);
router.post('/:userId/force-pay', forcePay);

export default router;
