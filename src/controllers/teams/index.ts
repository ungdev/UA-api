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
import promoteCaptain from './promoteCaptain';

const router = Router();

router.get('/', getTeams);
router.post('/', createTeam);
router.get('/current', getTeam);
router.put('/current', updateTeam);
router.delete('/current', deleteTeam);
router.delete('/current/users/:userId', kickUser);
router.put('/current/captain/:userId', promoteCaptain);

router.post('/:teamId/joinRequests', createTeamRequest);
router.delete('/current/joinRequests/:userId', deleteTeamRequest);
router.post('/current/joinRequests/:userId', acceptRequest);

router.post('/current/lock', lockTeam);

export default router;
