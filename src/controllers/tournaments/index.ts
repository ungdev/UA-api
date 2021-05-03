import { Router } from 'express';
import getTournaments from './getTournaments';

const router = Router();

router.get('/', getTournaments);

export default router;
