import { Router } from 'express';
import getItem from './getItem';
import getItems from './getItems';
import stock from './stock';

const router = Router();

router.patch('/:itemId', stock);
router.get('/:itemId', getItem);
router.get('//', getItems);

export default router;
