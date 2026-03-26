// test-complete-flow.js - Test payment, appliances, and utilities
import 'dotenv/config';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
const PYTHON_ENGINE_URL = 'http://localhost:8001';

console.log('\n' + '='.repeat(80));
console.log('🧪 METERMATE COMPLETE FLOW TEST');
console.log('='.repeat(80) + '\n');

// TEST 1: Debug endpoints working?
console.log('📋 TEST 1: Backend Debug Endpoints');
console.log('────────────────────────────────────');

try {
  const tokenRes = await axios.get(`http://localhost:5000/debug/test-token`);
  console.log('✅ Token Generation:', tokenRes.data.message);
  console.log('   Token Length:', tokenRes.data.tokenLength);
} catch (error) {
  console.error('❌ Token Generation Failed:', error.message);
}

try {
  const codeRes = await axios.get(`http://localhost:5000/debug/electricity-code`);
  console.log('✅ Electricity Code:', codeRes.data.paymentCode);
  console.log('   Biller:', codeRes.data.billerName);
} catch (error) {
  console.error('❌ Electricity Code Failed:', error.message);
}

console.log('');

// TEST 2: Meter validation endpoint
console.log('📋 TEST 2: Meter Validation Endpoint');
console.log('──────────────────────────────────');
console.log('To test meter validation, you need a valid test meter number from Interswitch');
console.log('Usage: curl -X POST http://localhost:5000/debug/validate-meter/YOUR_METER_NUMBER');
console.log('');

// TEST 3: Check if database is working
console.log('📋 TEST 3: Database Status');
console.log('─────────────────────────');

try {
  const healthRes = await axios.get('http://localhost:5000');
  console.log('✅ Backend Server:', healthRes.data.message);
} catch (error) {
  console.error('❌ Backend Server Error:', error.message);
}

console.log('');

// TEST 4: Python AI Engine
console.log('📋 TEST 4: Python Cost Allocation Engine');
console.log('────────────────────────────────────────');

try {
  const pythonRes = await axios.get(`${PYTHON_ENGINE_URL}/health`);
  console.log('✅ Python Engine Status:', pythonRes.data);
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    console.error('❌ Python Engine NOT RUNNING');
    console.log('   Start it with: cd python-engine && python app.py');
  } else {
    console.error('❌ Python Engine Error:', error.message);
  }
}

console.log('');

// TEST 5: Test Cost Calculation
console.log('📋 TEST 5: Test Cost Allocation Calculation');
console.log('─────────────────────────────────────────');

const testData = {
  total_cost: 10000, // ₦10,000
  appliances: [
    { user_id: 'user1', wattage: 1500, hours: 2 },   // 1500 * 2 / 1000 = 3 kWh
    { user_id: 'user2', wattage: 2000, hours: 3 },   // 2000 * 3 / 1000 = 6 kWh
    { user_id: 'user3', wattage: 500, hours: 4 }     // 500 * 4 / 1000 = 2 kWh
  ]
  // Total: 11 kWh
  // Expected shares:
  // User1: 3/11 * 10000 = ₦2,727.27
  // User2: 6/11 * 10000 = ₦5,454.55
  // User3: 2/11 * 10000 = ₦1,818.18
};

console.log('Input:');
console.log('  Total Cost: ₦' + testData.total_cost.toLocaleString());
console.log('  Appliances:');
testData.appliances.forEach(app => {
  const kWh = (app.wattage * app.hours) / 1000;
  console.log(`    - User ${app.user_id}: ${app.wattage}W × ${app.hours}h = ${kWh} kWh/day`);
});

try {
  const calcRes = await axios.post(`${PYTHON_ENGINE_URL}/calculate-costs`, testData);
  console.log('\n✅ Cost Breakdown:');
  Object.entries(calcRes.data).forEach(([userId, cost]) => {
    console.log(`   ${userId}: ₦${parseFloat(cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  });
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    console.error('❌ Python Engine NOT RUNNING');
  } else {
    console.error('❌ Cost Calculation Error:', error.message);
  }
}

console.log('');
console.log('='.repeat(80));
console.log('✨ TEST SUMMARY');
console.log('='.repeat(80));
console.log(`
All systems green if you see:
✅ Backend server responding
✅ Token generation working
✅ Electricity code retrieved
✅ Python engine running
✅ Cost calculation working

If any failed:
❌ Backend - Check: npm run dev in backend folder
❌ Python - Check: python app.py in python-engine folder
❌ Token - Check: .env.local has correct Interswitch credentials
`);
