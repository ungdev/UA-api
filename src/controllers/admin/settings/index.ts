import { Router } from 'express';
import updateSetting from './updateSetting';

const router = Router();

router.patch('/:setting', updateSetting);

export default router;
