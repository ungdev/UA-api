import { Router } from 'express';
import auth from './auth';
import carts from './carts';
import scan from './scan';
import users from './users';
import emails from './emails';
import logs from './logs';
import items from './items';

const router = Router();

router.use('/auth', auth);
router.use('/carts', carts);
router.use('/scan', scan);
router.use('/users', users);
router.use('/emails', emails);
router.use('/logs', logs);
router.use('/items', items);

export default router;
