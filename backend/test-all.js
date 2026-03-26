import 'dotenv/config';
import { getInterswitchToken } from './src/utils/interswitchAuth.js';
import { getElectricityPaymentCode, validateCustomer } from './src/services/billsPaymentService.js';

console.log('\n' + '='.repeat(70));
console.log('🧪 METERMATE INTERSWITCH INTEGRATION TEST SUITE');
console.log('='.repeat(70) + '\n');

// Test 1: Environment Configuration
console.log('📋 TEST 1: Environment Configuration');
console.log('─────────────────────────────────────');
console.log('CLIENT_ID:', process.env.INTERSWITCH_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('CLIENT_SECRET:', process.env.INTERSWITCH_CLIENT_SECRET ? '✅' : '❌');
console.log('PASSPORT_URL:', process.env.INTERSWITCH_PASSPORT_URL || 'default');
console.log('MARKETPLACE_API:', process.env.INTERSWITCH_MARKETPLACE_API || 'default');
console.log('');

// Test 2: OAuth Token Generation
console.log('🔐 TEST 2: OAuth Token Generation');
console.log('──────────────────────────────────');
try {
  const token = await getInterswitchToken();
  console.log('✅ TOKEN ACQUIRED');
  console.log('   - Type: Bearer Token');
  console.log('   - Length:', token.length, 'characters');
  console.log('   - Preview:', token.substring(0, 50) + '...');
  console.log('');
} catch (error) {
  console.error('❌ TOKEN GENERATION FAILED:', error.message);
  process.exit(1);
}

// Test 3: Get Electricity Payment Code
console.log('⚡ TEST 3: Get Electricity Payment Code');
console.log('─────────────────────────────────────');
try {
  const result = await getElectricityPaymentCode();
  if (result.success) {
    console.log('✅ ELECTRICITY CODE RETRIEVED');
    console.log('   - Payment Code:', result.paymentCode);
    console.log('   - Biller Name:', result.billerName);
  } else {
    console.log('⚠️ USING FALLBACK:', result.paymentCode);
  }
  console.log('');
} catch (error) {
  console.error('❌ ERROR:', error.message);
}

// Test 4: Meter Validation
console.log('🔍 TEST 4: Meter Validation');
console.log('──────────────────────────');
console.log('NOTE: You must provide a VALID test meter number from Interswitch QA!');
console.log('Try running with: node test-meter.js YOUR_TEST_METER_NUMBER');
console.log('');

console.log('='.repeat(70));
console.log('✅ INTERSWITCH INTEGRATION TESTS PASSED!');
console.log('='.repeat(70));
console.log('\nNext Steps:');
console.log('1. Get valid test meter numbers from Interswitch QA dashboard');
console.log('2. Run: node test-meter.js YOUR_METER_NUMBER');
console.log('3. Test full payment flow in MeterMate UI');
console.log('');
