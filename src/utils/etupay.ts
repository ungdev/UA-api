import etupay, { InitializerReturn } from '@ung/node-etupay';
import { etupayId, etupayUrl, etupayKey } from './env';

export default (): InitializerReturn =>
  etupay({
    id: etupayId(),
    url: etupayUrl(),
    key: etupayKey(),
  });
