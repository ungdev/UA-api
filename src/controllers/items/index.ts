import { Router } from 'express';
import getItems from './getItems';

const router = Router();

router.get('/', getItems);

export default router;
