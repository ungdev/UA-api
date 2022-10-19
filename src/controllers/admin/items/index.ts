import { Router } from 'express';
import stock from './stock';

const router = Router();

router.patch('/:itemId', stock);

export default router;
