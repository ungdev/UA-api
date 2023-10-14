import { Router } from 'express';
import updateTournament from './updateTournament';
import getTournaments from './getTournaments';
import updateTournamentsPosition from './updateTournamentsPosition';

const router = Router();

router.get('/', getTournaments);
router.patch('/', updateTournamentsPosition);
router.patch('/:tournamentId', updateTournament);

export default router;
