import { Router } from 'express';
import getTeams from './getTeams';
import getTeam from './getTeam';
import createTeam from './createTeam';
import updateTeam from './updateTeam';
import deleteTeam from './deleteTeam';
import createTeamRequest from './createTeamRequest';
import deleteTeamRequest from './deleteTeamRequest';
import lockTeam from './lockTeam';
import acceptRequest from './acceptRequest';
import kickUser from './kickUser';

const router = Router();

router.get('/', getTeams);
router.post('/', createTeam);
router.get('/:teamId', getTeam);
router.put('/:teamId', updateTeam);
router.delete('/:teamId', deleteTeam);
router.delete('/:teamId/users/:userId', kickUser);

router.post('/:teamId/joinRequests', createTeamRequest);
router.delete('/:teamId/joinRequests/:userId', deleteTeamRequest);
router.post('/:teamId/joinRequests/:userId', acceptRequest);

router.post('/:teamId/lock', lockTeam);

export default router;
