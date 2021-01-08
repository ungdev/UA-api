import { Router } from 'express';
import getTeams from './getTeams';
import createTeam from './createTeam';

const router = Router();

router.get('/', getTeams);
router.post('/', createTeam);

export default router;
