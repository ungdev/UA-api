import { Router } from 'express';
import getItem from './getItem';
import getItems from './getItems';
import updateItem from './updateItem';
import updateItemsPosition from './updateItemsPosition';

const router = Router();

router.patch('/:itemId', updateItem);
router.get('/:itemId', getItem);
router.get('//', getItems);
router.patch('/', updateItemsPosition);

export default router;
