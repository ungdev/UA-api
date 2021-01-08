import { Router } from 'express';
import register from './register';
import validate from './validate';
import login from './login';

const router = Router();

router.post('/register', register);
router.post('/validate/:token', validate);
router.post('/login', login);

export default router;
