import { Router } from 'express';
import createCart from './createCart';
import getCarts from './getCarts';
import updateUser from './updateUser';

const router = Router();

// router.get('/', getUser);

router.put('/:userId', updateUser);
router.post('/:userId/carts', createCart);
router.get('/:userId/carts', getCarts);

export default router;
