import { Router } from 'express';
import getItem from './getItem';
import getItems from './getItems';
import updateItem from './updateItem';
import updateItemsPosition from './updateItemsPosition';

const router = Router();

router.get('/', getItems);
router.patch('/', updateItemsPosition);
router.get('/:itemId', getItem);
router.patch('/:itemId', updateItem);

export default router;
