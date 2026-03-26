import 'dotenv/config';
import { getInterswitchToken } from './src/utils/interswitchAuth.js';

console.log('Testing Interswitch Token Generation...');
console.log('Environment:');
console.log('CLIENT_ID:', process.env.INTERSWITCH_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('CLIENT_SECRET:', process.env.INTERSWITCH_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
console.log('PASSPORT_URL:', process.env.INTERSWITCH_PASSPORT_URL);
console.log('');

try {
  const token = await getInterswitchToken();
  console.log('✅ TOKEN GENERATION SUCCESSFUL!');
  console.log('Token (first 50 chars):', token.substring(0, 50) + '...');
  console.log('Token Length:', token.length);
  process.exit(0);
} catch (error) {
  console.error('❌ TOKEN GENERATION FAILED:');
  console.error('Error:', error.message);
  process.exit(1);
}
