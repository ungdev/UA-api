import { Router } from 'express';
import getTicket from './getTicket';

const router = Router();

router.get('/', getTicket);
router.get('/:cartItemId', getTicket);

export default router;
