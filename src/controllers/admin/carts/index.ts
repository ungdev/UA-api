import { Router } from 'express';
import refund from './refund';

const router = Router();

router.post('/:cartId/refund', refund);

export default router;
