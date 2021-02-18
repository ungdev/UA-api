import { Router } from 'express';
import auth from './auth';
import carts from './carts';

const router = Router();

router.use('/auth', auth);

router.use('/carts', carts);

export default router;
