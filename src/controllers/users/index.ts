import { Router } from 'express';
import createCart from './createCart';

const router = Router();

// router.get('/', getUser);

router.post('/:userId/carts', createCart);

export default router;
