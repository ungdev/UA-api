import { Router } from 'express';
import auth from './auth';
import carts from './carts';
import scan from './scan';
import users from './users';
import emails from './emails';

const router = Router();

router.use('/auth', auth);
router.use('/carts', carts);
router.use('/scan', scan);
router.use('/users', users);
router.use('/emails', emails);

export default router;
