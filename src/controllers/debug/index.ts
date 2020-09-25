import { Router } from 'express';
import getDebug from './getDebug';
import { isUserId } from '../../middlewares/parameters';

export default (): Router => {
  const router = Router();

  router.get('/:userId', getDebug);

  return router;
};
