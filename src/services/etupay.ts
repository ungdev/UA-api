import etupay from '@ung/node-etupay';
import env from '../utils/env';

const instance = etupay({
  id: env.etupay.id,
  url: env.etupay.url,
  key: env.etupay.key,
});

export const { Basket, middleware } = instance;
