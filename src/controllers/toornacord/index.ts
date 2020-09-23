import { Router } from 'express';
import authorizeWebhook from './authorizeWebhook';
import handleWebhook from './handleWebhook';

export default (): Router => {
  const router = Router();

  router.head('/', authorizeWebhook);

  router.post('/', handleWebhook);

  return router;
};
