import { Router } from 'express';
import getTeams from './getTeams';
import getTeam from './getTeam';
import getIndividualTeam from './getIndividualTeam';
import createTeam from './createTeam';
import updateTeam from './updateTeam';
import deleteTeam from './deleteTeam';
import createTeamRequest from './createTeamRequest';
import cancelTeamRequest from './cancelTeamRequest';
import refuseTeamRequest from './refuseTeamRequest';
import lockTeam from './lockTeam';
import acceptRequest from './acceptRequest';
import kickUser from './kickUser';
import promoteCaptain from './promoteCaptain';
import leaveTeam from './leaveTeam';

const router = Router();

router.get('/', getTeams);
router.get('/:teamId', getIndividualTeam);
router.post('/', createTeam);
router.get('/current', getTeam);
router.put('/current', updateTeam);
router.delete('/current', deleteTeam);
router.delete('/current/users/current', leaveTeam);
router.delete('/current/users/:userId', kickUser);
router.put('/current/captain/:userId', promoteCaptain);

router.post('/:teamId/join-requests', createTeamRequest);
router.delete('/current/join-requests/current', cancelTeamRequest);
router.delete('/current/join-requests/:userId', refuseTeamRequest);
router.post('/current/join-requests/:userId', acceptRequest);

router.post('/current/lock', lockTeam);

export default router;
