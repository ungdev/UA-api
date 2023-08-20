import { Router } from 'express';
import updateTournament from './updateTournament';
import getTournaments from './getTournaments';

const router = Router();

router.get('/', getTournaments);
router.patch('/:tournamentId', updateTournament);

export default router;
