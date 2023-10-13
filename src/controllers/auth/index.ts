import { Router } from 'express';
import register from './register';
import validate from './validate';
import login from './login';
import askResetPassword from './askResetPassword';
import resetPassword from './resetPassword';
import resendEmail from './resendEmail';

const router = Router();

router.post('/register', register);
router.post('/validate/:token', validate);
router.post('/login', login);
router.post('/reset-password/ask', askResetPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/resendEmail', resendEmail);

export default router;
