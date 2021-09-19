import { Router } from 'express';
import { clientCallback as etupayClientCallback, bankCallback as etupayBankCallback } from './callback';

const router = Router();

router.get('/callback', etupayClientCallback);
router.post('/callback', etupayBankCallback);

export default router;
