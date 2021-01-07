import { Router } from 'express';
import getTeams from './getTeams';

const router = Router();

router.get('/', getTeams);

export default router;
