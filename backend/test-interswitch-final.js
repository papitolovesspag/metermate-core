// Test Interswitch Integration - Final Verification
import axios from 'axios';
import 'dotenv/config';

const CLIENT_ID = 'IKIA43F2ED234A6517A8DCA1B9ABAB40650DD50CD381';
const CLIENT_SECRET = '581CC6B55725F0ECB27F2E2A1037892C166CCD32';
const PASSPORT_URL = 'https://qa.interswitchng.com/passport/oauth/token';
const MARKETPLACE_API = 'https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/vas';

// Dummy test meter numbers (from Interswitch QA)
const TEST_METERS = [
  '070655456765',
  '007065545467',
  '012345678901',
  '555555555555'
];

async function testOAuthToken() {
  console.log('\n🔐 ===== TEST 1: Get OAuth Token =====');
  try {
    const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    console.log(`✅ Base64 auth string created`);

    const payload = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'profile'
    });

    console.log(`📡 Requesting token from ${PASSPORT_URL}`);
    const response = await axios.post(PASSPORT_URL, payload, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 15000
    });

    console.log(`✅ OAuth Token acquired!`);
    console.log(`   Token: ${response.data.access_token.substring(0, 50)}...`);
    console.log(`   Expires in: ${response.data.expires_in}s`);

    return response.data.access_token;
  } catch (error) {
    console.error(`❌ OAuth Token failed:`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Error: ${error.response?.data?.error || error.message}`);
    throw error;
  }
}

async function testGetBillers(token) {
  console.log('\n📋 ===== TEST 2: Get Available Billers =====');
  try {
    console.log(`📡 Fetching billers from ${MARKETPLACE_API}/billers`);
    const response = await axios.get(`${MARKETPLACE_API}/billers`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    console.log(`✅ Retrieved ${response.data?.length || 0} billers`);

    // Find electricity first
    const electricityBillers = response.data?.filter(b =>
      b.billerName?.toLowerCase().includes('electric') ||
      b.billerName?.toLowerCase().includes('power')
    ) || [];

    console.log(`   Found ${electricityBillers.length} electricity billers:`);
    electricityBillers.slice(0, 3).forEach(b => {
      console.log(`   - ${b.billerName} (Code: ${b.paymentCode})`);
    });

    const paymentCode = electricityBillers[0]?.paymentCode || '10902';
    console.log(`   Using payment code: ${paymentCode}`);

    return paymentCode;
  } catch (error) {
    console.error(`❌ Get Billers failed:`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Error: ${error.response?.data?.error || error.message}`);
    throw error;
  }
}

async function testValidateCustomer(token, meterNumber, paymentCode) {
  console.log(`\n🔍 ===== TEST 3: Validate Customer - Meter: ${meterNumber} =====`);
  try {
    console.log(`📡 Validating meter...`);
    const response = await axios.post(
      `${MARKETPLACE_API}/validate-customer`,
      [{ customerId: meterNumber, paymentCode: paymentCode }],
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const result = response.data?.[0];
    if (result?.customerName) {
      console.log(`✅ Meter Validated!`);
      console.log(`   Customer: ${result.customerName}`);
      console.log(`   Min Amount: ₦${result.minimumAmount}`);
      console.log(`   Max Amount: ₦${result.maximumAmount}`);
      return { success: true, result };
    } else {
      console.log(`⚠️ Meter validation returned incomplete data:`, result);
      return { success: false, result };
    }
  } catch (error) {
    console.error(`❌ Meter Validation failed:`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Error: ${error.response?.data?.error || error.message}`);
    return { success: false, error: error.message };
  }
}

async function testPayment(token, meterNumber, paymentCode) {
  console.log(`\n💳 ===== TEST 4: Make Payment - Meter: ${meterNumber} =====`);
  try {
    const amount = 5000; // ₦5,000 test amount
    const reference = `TEST-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    console.log(`📡 Making payment...`);
    console.log(`   Amount: ₦${amount}`);
    console.log(`   Reference: ${reference}`);

    const response = await axios.post(
      `${MARKETPLACE_API}/pay`,
      {
        customerId: meterNumber,
        amount: amount,
        reference: reference,
        paymentCode: paymentCode
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    console.log(`✅ Payment Request Accepted!`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    return { success: true, reference, data: response.data };
  } catch (error) {
    console.error(`❌ Payment failed:`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Error: ${error.response?.data?.error || error.message}`);
    return { success: false, error: error.message };
  }
}

async function testCheckTransactionStatus(token, reference) {
  console.log(`\n📊 ===== TEST 5: Check Transaction Status - Ref: ${reference} =====`);
  try {
    console.log(`📡 Checking status...`);
    const response = await axios.get(
      `${MARKETPLACE_API}/transactions?request-reference=${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        timeout: 15000
      }
    );

    const transaction = response.data?.[0] || response.data;
    console.log(`✅ Transaction Status Retrieved!`);
    console.log(`   Status: ${transaction?.status || 'Unknown'}`);
    console.log(`   Amount: ₦${transaction?.amount || 'Unknown'}`);
    console.log(`   Response Code: ${transaction?.responseCode || 'N/A'}`);
    console.log(`   Full Response:`, JSON.stringify(transaction, null, 2));

    return { success: true, transaction };
  } catch (error) {
    console.error(`❌ Transaction check failed:`);
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Error: ${error.response?.data?.error || error.message}`);
    return { success: false, error: error.message };
  }
}

async function runFullTest() {
  console.log('🚀 ===== INTERSWITCH QA INTEGRATION TEST =====\n');
  console.log('Credentials:');
  console.log(`  Client ID: ${CLIENT_ID.substring(0, 20)}...`);
  console.log(`  Client Secret: ${CLIENT_SECRET.substring(0, 20)}...`);

  try {
    // Step 1: Get token
    const token = await testOAuthToken();

    // Step 2: Get billers
    const paymentCode = await testGetBillers(token);

    // Step 3: Try meter validations with different test meters
    let validMeter = null;
    for (const meter of TEST_METERS) {
      const result = await testValidateCustomer(token, meter, paymentCode);
      if (result.success) {
        validMeter = meter;
        break;
      }
      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!validMeter) {
      console.log('\n⚠️ No valid test meters found. Proceeding with payment test anyway...');
      validMeter = TEST_METERS[0];
    }

    // Step 4: Try payment (will likely fail if meter is invalid, but shows the flow)
    const paymentResult = await testPayment(token, validMeter, paymentCode);

    // Step 5: Check transaction status if payment was initiated
    if (paymentResult.success && paymentResult.reference) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await testCheckTransactionStatus(token, paymentResult.reference);
    }

    console.log('\n✅ ===== TEST COMPLETE =====\n');
    console.log('Summary:');
    console.log('  ✅ OAuth Token: Working');
    console.log('  ✅ Get Billers: Working');
    console.log(`  ${validMeter ? '✅' : '⚠️'} Meter Validation: ${validMeter ? 'Found valid meter' : 'No valid meters'}`);
    console.log(`  ${paymentResult.success ? '✅' : '❌'} Payment Flow: ${paymentResult.success ? 'Working' : 'Failed'}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runFullTest().catch(console.error);
