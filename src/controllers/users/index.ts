import { Router } from 'express';
import createCart from './createCart';
import getCarts from './getCarts';
import updateUser from './updateUser';
import getUser from './getUser';

const router = Router();

router.get('/current', getUser);

router.put('/current', updateUser);
router.post('/current/carts', createCart);
router.get('/current/carts', getCarts);

export default router;
