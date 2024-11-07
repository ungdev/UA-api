import { Router } from 'express';
import getMails from './getMails';
import send from './send';
import sendTemplate from './sendTemplate';
import sendCustom from './sendCustom';

const router = Router();

router.get('/', getMails);
router.post('/', send);
router.post('/template', sendTemplate);
router.post('/custom', sendCustom);

export default router;
