import 'dotenv/config';
import { validateCustomer, getElectricityPaymentCode } from './src/services/billsPaymentService.js';

const meterNumber = process.argv[2];

if (!meterNumber) {
  console.log('\n❌ Usage: node test-meter.js METER_NUMBER');
  console.log('\nExample: node test-meter.js 070655456765');
  console.log('\nGet valid test meters from: Interswitch QA Dashboard');
  process.exit(1);
}

console.log('\n' + '='.repeat(60));
console.log('🔍 METER VALIDATION TEST');
console.log('='.repeat(60));
console.log('Testing meter:', meterNumber);
console.log('');

try {
  // Get electricity payment code
  const codeResult = await getElectricityPaymentCode();
  const paymentCode = codeResult.paymentCode;
  console.log('Using payment code:', paymentCode);
  console.log('');

  // Validate meter
  console.log('📡 Validating meter...');
  const result = await validateCustomer(meterNumber, paymentCode);

  if (result.success) {
    console.log('✅ METER VALIDATION SUCCESSFUL!\n');
    console.log('Customer Details:');
    console.log('  - Meter/Customer ID:', result.customerId);
    console.log('  - Customer Name:', result.customerName);
    console.log('  - Min Amount:', result.minimumAmount ? `₦${result.minimumAmount}` : 'N/A');
    console.log('  - Max Amount:', result.maximumAmount ? `₦${result.maximumAmount}` : 'N/A');
    console.log('');
    console.log('✅ METER EXISTS IN GRID - READY FOR PAYMENT!');
  } else {
    console.log('❌ METER VALIDATION FAILED');
    console.log('Error:', result.error);
    console.log('');
    console.log('This could mean:');
    console.log('- Meter number is invalid');
    console.log('- Meter does not exist in the grid');
    console.log('- Invalid payment code');
  }
} catch (error) {
  console.error('❌ ERROR:', error.message);
}

console.log('='.repeat(60) + '\n');
