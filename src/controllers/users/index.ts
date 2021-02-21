import { Router } from 'express';
import createCart from './createCart';
import getCarts from './getCarts';
import updateUser from './updateUser';

const router = Router();

// router.get('/', getUser);

router.put('/current', updateUser);
router.post('/current/carts', createCart);
router.get('/current/carts', getCarts);

export default router;
