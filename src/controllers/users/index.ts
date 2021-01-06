import { Router } from 'express';
import getUser from './getUser';

const router = Router();

router.get('/', getUser);

export default router;
