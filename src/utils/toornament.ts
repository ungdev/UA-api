import axios from 'axios';
import qs from 'querystring';
import { ToornamentCredentials } from '../types';
import { toornamentClientId, toornamentClientSecret, toornamentKey } from './environment';

const clientCredentials = {
  grant_type: 'client_credentials',
  client_id: toornamentClientId(),
  client_secret: toornamentClientSecret(),
};

const toornamentTokenURL = 'https://api.toornament.com/oauth/v2/token';

export const toornamentCredentials: ToornamentCredentials = {
  participantToken: '',
  registrationToken: '',
  expirationDate: new Date(),
  apiKey: toornamentKey(),
};

export const toornamentInit = async () => {
  const responseParticipantToken = await axios.post(
    toornamentTokenURL,
    qs.stringify({ ...clientCredentials, scope: 'organizer:participant' }),
    { headers: { 'content-type': 'application/x-www-form-urlencoded' } },
  );
  const responseRegistrationToken = await axios.post(
    toornamentTokenURL,
    qs.stringify({ ...clientCredentials, scope: 'organizer:registration' }),
    { headers: { 'content-type': 'application/x-www-form-urlencoded' } },
  );
  const participantToken = responseParticipantToken.data.access_token;
  const registrationToken = responseRegistrationToken.data.access_token;
  const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

  toornamentCredentials.participantToken = participantToken;
  toornamentCredentials.registrationToken = registrationToken;
  toornamentCredentials.expirationDate = expirationDate;
};
