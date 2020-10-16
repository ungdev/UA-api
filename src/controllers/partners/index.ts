import { Router } from 'express';
import getPartners from './getPartners';

export default (): Router => {
  const router = Router();

  router.get('/', getPartners);

  return router;
};
