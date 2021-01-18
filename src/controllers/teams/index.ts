import { Router } from 'express';
import getTeams from './getTeams';
import getTeam from './getTeam';
import createTeam from './createTeam';
import updateTeam from './updateTeam';
import deleteTeam from './deleteTeam';
import createTeamRequest from './createTeamRequest';
import deleteTeamRequest from './deleteTeamRequest';
import lockTeam from './lockTeam';

const router = Router();

router.get('/', getTeams);
router.post('/', createTeam);
router.get('/:teamId', getTeam);
router.put('/:teamId', updateTeam);
router.delete('/:teamId', deleteTeam);

router.post('/:teamId/joinRequests', createTeamRequest);
router.delete('/:teamId/joinRequests/:userId', deleteTeamRequest);

router.post('/:teamId/lock', lockTeam);

export default router;
