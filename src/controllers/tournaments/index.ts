import { Router } from 'express';
import getTournaments from './getTournaments';

export default (): Router => {
  const router = Router();

  router.get('/', getTournaments);

  return router;
};
