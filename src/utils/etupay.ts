import etupay, { InitializerReturn } from '@ung/node-etupay';
import env from './env';

export default (): InitializerReturn =>
  etupay({
    id: env.etudpay.id,
    url: env.etudpay.url,
    key: env.etudpay.key,
  });
