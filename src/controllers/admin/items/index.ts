import { Router } from 'express';
import getItem from './getItem';
import getItems from './getItems';
import updateItem from './updateItem';

const router = Router();

router.patch('/:itemId', updateItem);
router.get('/:itemId', getItem);
router.get('//', getItems);

export default router;
