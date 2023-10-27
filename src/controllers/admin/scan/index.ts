import { Router } from 'express';
import scan from './scan';
import scanStats from './scanStats';

const router = Router();

router.get('/', scanStats);
router.post('/', scan);

export default router;
