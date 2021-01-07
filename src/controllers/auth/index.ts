import { Router } from 'express';
import register from './register';

const router = Router();

router.post('/register', register);

export default router;
