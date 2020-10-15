import bodyParser from 'body-parser';
import { Router } from 'express';
import postRegister from './postRegister';

export default (): Router => {
  const router = Router();

  router.post('/register', postRegister);

  return router;
};
