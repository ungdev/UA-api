import { Router } from 'express';
import item from './item';
import stock from './stock';

const router = Router();

router.patch('/:itemId', stock);
router.get('/:itemId', item);

export default router;
