import { Router } from 'express';
import getTeams from './getTeams';
import createTeam from './createTeam';
import updateTeam from './updateTeam';

const router = Router();

router.get('/', getTeams);
router.post('/', createTeam);
router.put('/:teamId', updateTeam);

export default router;
