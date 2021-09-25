import { Router } from 'express';
import createCart from './createCart';
import getCarts from './getCarts';
import updateUser from './updateUser';
import getUser from './getUser';

const router = Router();

router.get('/current', getUser);

router.patch('/current', updateUser);
router.post('/current/carts', createCart);
router.get('/current/carts', getCarts);

// UPDATE : Add route /current/spectate for both post and delete methods
// DOCS : Add route /current/spactate to docs

export default router;
