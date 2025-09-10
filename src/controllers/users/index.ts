import { Router } from 'express';
import createCart from './createCart';
import getCarts from './getCarts';
import updateUser from './updateUser';
import getUser from './getUser';
import { become, leave } from './spectate';
import { fetchRemoteTicket } from './getRemoteTicket';
import getOrgas from './getOrgas';
import updateUserFfsu from './updateUserFfsu';

const router = Router();

router.get('/current', getUser);

router.patch('/current', updateUser);
router.patch('/current/ffsu', updateUserFfsu);
router.post('/current/carts', createCart);
router.get('/current/carts', getCarts);

router.post('/current/spectate', become);
router.delete('/current/spectate', leave);

router.get('/:userId/ticket', fetchRemoteTicket);

router.get('/orgas', getOrgas);

export default router;
