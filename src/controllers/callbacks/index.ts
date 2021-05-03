import { Router } from 'express';
import { clientCallback as etupayClientCallback, bankCallback as etupayBankCallback } from './etupay';

const router = Router();

router.get('/etupay', etupayClientCallback);
router.post('/etupay', etupayBankCallback);

export default router;
