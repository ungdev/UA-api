import etupay from '@ung/node-etupay';
import { etupayId, etupayUrl, etupayKey } from './env';

export default () =>
  etupay({
    id: etupayId(),
    url: etupayUrl(),
    key: etupayKey(),
  });
