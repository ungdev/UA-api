import { Router } from 'express';
import logs from './logs';

const router = Router();

router.get('/', logs);

export default router;
