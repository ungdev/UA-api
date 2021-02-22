import { Router } from 'express';
import auth from './auth';
import carts from './carts';
import scan from './scan';

const router = Router();

router.use('/auth', auth);
router.use('/carts', carts);
router.use('/scan', scan);

export default router;
