import axios from 'axios';
import 'dotenv/config';

const CLIENT_ID = (process.env.INTERSWITCH_CLIENT_ID || '').trim();
const CLIENT_SECRET = (process.env.INTERSWITCH_CLIENT_SECRET || '').trim();
const PASSPORT_URL = process.env.INTERSWITCH_PASSPORT_URL || 'https://qa.interswitchng.com/passport/oauth/token';
const TOKEN_SCOPE = process.env.INTERSWITCH_SCOPE || 'profile';

let tokenCache = {
  accessToken: null,
  expiresAt: 0
};

export const debugInterswitchConfig = () => {
  console.log('\n[Interswitch Config]');
  console.log(`Client ID set: ${CLIENT_ID ? 'yes' : 'no'}`);
  console.log(`Client Secret set: ${CLIENT_SECRET ? 'yes' : 'no'}`);
  console.log(`Passport URL: ${PASSPORT_URL}`);
  console.log(`Demo mode: ${process.env.INTERSWITCH_DEMO_MODE === 'true' ? 'enabled' : 'disabled'}`);
};

const requestInterswitchToken = async () => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing INTERSWITCH_CLIENT_ID or INTERSWITCH_CLIENT_SECRET');
  }

  const payload = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: TOKEN_SCOPE
  });

  const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  const response = await axios.post(PASSPORT_URL, payload, {
    headers: {
      Authorization: `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 15000
  });

  const accessToken = response.data?.access_token;
  const expiresIn = Number(response.data?.expires_in) || 300;
  if (!accessToken) {
    throw new Error('Interswitch token response did not contain access_token');
  }

  tokenCache = {
    accessToken,
    expiresAt: Date.now() + (expiresIn - 30) * 1000
  };

  return accessToken;
};

export const getInterswitchToken = async () => {
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }
  return requestInterswitchToken();
};

export const getInterswitchHeaders = async (extraHeaders = {}) => {
  const token = await getInterswitchToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...extraHeaders
  };
};

export { CLIENT_ID, CLIENT_SECRET, PASSPORT_URL };
