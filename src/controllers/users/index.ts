import { Router } from 'express';
import createCart from './createCart';
import getCarts from './getCarts';

const router = Router();

// router.get('/', getUser);

router.post('/:userId/carts', createCart);
router.get('/:userId/carts', getCarts);

export default router;
