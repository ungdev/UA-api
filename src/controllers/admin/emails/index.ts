import { Router } from 'express';
import getMails from './getMails';
import send from './send';

const router = Router();

router.get('/', getMails);
router.post('/', send);

export default router;
