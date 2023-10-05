import { Router } from 'express';
import loginAs from './loginAs';
import login from './login';

const router = Router();

router.post('/login', login);
router.post('/login/:userId', loginAs);

export default router;
