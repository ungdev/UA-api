import { Router } from 'express';
import validateCart from './validateCart';

const router = Router();

router.post('/ffsu', validateCart);

export default router;
