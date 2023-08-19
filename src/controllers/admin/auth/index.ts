import { Router } from 'express';
import loginAs from './loginAs';

const router = Router();

router.post('/login/:userId', loginAs);

export default router;
