// src/utils/interswitchAuth.js
import axios from 'axios';
import crypto from 'crypto';
import 'dotenv/config';

// ===== CORRECT INTERSWITCH QA ENDPOINTS =====
const CLIENT_ID = (process.env.INTERSWITCH_CLIENT_ID || '').trim();
const CLIENT_SECRET = (process.env.INTERSWITCH_CLIENT_SECRET || '').trim();
const PASSPORT_URL = process.env.INTERSWITCH_PASSPORT_URL || 'https://qa.interswitchng.com/passport/oauth/token';
const MARKETPLACE_API = process.env.INTERSWITCH_MARKETPLACE_API || 'https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/vas';

// Debug configuration - call this on server startup
export const debugInterswitchConfig = () => {
  console.log('\n🔧 ===== INTERSWITCH QA CONFIGURATION =====');
  console.log(`Client ID: ${CLIENT_ID ? '✅ Set (' + CLIENT_ID.substring(0, 15) + '...)' : '❌ MISSING'}`);
  console.log(`Client Secret: ${CLIENT_SECRET ? '✅ Set (length: ' + CLIENT_SECRET.length + ')' : '❌ MISSING'}`);
  console.log(`Passport URL: ${PASSPORT_URL}`);
  console.log(`Marketplace API: ${MARKETPLACE_API}`);
  console.log(`Current Timestamp: ${Math.floor(Date.now() / 1000)}`);
  console.log('=========================================\n');
};

// 1. Get the OAuth Bearer Token - Interswitch QA Environment
export const getInterswitchToken = async () => {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('Missing Interswitch credentials (CLIENT_ID or CLIENT_SECRET not set in .env)');
    }

    // Create Basic Auth header with credentials
    const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    // Use URLSearchParams for proper form-urlencoded format
    const payload = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'profile'  // Required by Interswitch QA
    });

    console.log(`📡 Requesting token from ${PASSPORT_URL}`);

    const response = await axios.post(PASSPORT_URL, payload, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 15000
    });

    if (!response.data.access_token) {
      throw new Error('No access_token in response');
    }

    console.log(`✅ Token acquired successfully (expires in ${response.data.expires_in || 'unknown'}s)`);
    return response.data.access_token;
  } catch (error) {
    console.error('❌ Token Request Failed:');
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    } else {
      console.error(error.message);
    }
    throw new Error(`Interswitch authentication failed: ${error.response?.data?.error_description || error.message}`);
  }
};

// 2. Get Bearer Token (simplified version)
export const getInterswitchHeaders = async () => {
  try {
    const token = await getInterswitchToken();

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log(`📋 Headers prepared with Bearer token`);
    return headers;
  } catch (error) {
    console.error('❌ Failed to prepare headers:', error.message);
    throw error;
  }
};

// Export endpoints and constants
export { CLIENT_ID, CLIENT_SECRET, PASSPORT_URL, MARKETPLACE_API };