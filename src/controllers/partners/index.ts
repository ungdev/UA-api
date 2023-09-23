import { Router } from 'express';
import getPartners from './getPartners';

const router = Router();

router.get('/', getPartners);

export default router;
