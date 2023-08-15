import { Router } from 'express';
import updateTournament from './updateTournament';

const router = Router();

router.patch('/:tournamentId', updateTournament);

export default router;
