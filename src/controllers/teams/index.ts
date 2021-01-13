import { Router } from 'express';
import getTeams from './getTeams';
import createTeam from './createTeam';
import updateTeam from './updateTeam';
import deleteTeam from './deleteTeam';

const router = Router();

router.get('/', getTeams);
router.post('/', createTeam);
router.put('/:teamId', updateTeam);
router.delete('/:teamId', deleteTeam);

export default router;
