import { Router } from 'express';
import scan from './scan';

const router = Router();

router.post('/scan/:qrcode', scan);

export default router;
