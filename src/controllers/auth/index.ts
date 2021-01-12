import { Router } from 'express';
import register from './register';
import validate from './validate';
import login from './login';
import resetPasswordFirstStep from './resetPasswordFirstStep';
import resetPasswordSecondStep from './resetPasswordSecondStep';

const router = Router();

router.post('/register', register);
router.post('/validate/:token', validate);
router.post('/login', login);
router.post('/reset-password', resetPasswordFirstStep);
router.post('/reset-password/:token', resetPasswordSecondStep);

export default router;
