import { Router } from 'express';
import createCart from './createCart';
import getCarts from './getCarts';
import updateUser from './updateUser';
import getUser from './getUser';
import { become, leave } from './spectate';

const router = Router();

router.get('/current', getUser);

router.patch('/current', updateUser);
router.post('/current/carts', createCart);
router.get('/current/carts', getCarts);

router.post('/current/spectate', become);
router.delete('/current/spectate', leave);

export default router;
