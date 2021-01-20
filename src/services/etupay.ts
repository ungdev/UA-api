import etupay from '@ung/node-etupay';
import env from '../utils/env';

export default etupay({
  id: env.etupay.id,
  url: env.etupay.url,
  key: env.etupay.key,
}).Basket;
