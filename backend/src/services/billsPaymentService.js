// backend/src/services/billsPaymentService.js
import axios from 'axios';
import { getInterswitchHeaders } from '../utils/interswitchAuth.js';

const MARKETPLACE_API = process.env.INTERSWITCH_MARKETPLACE_API || 'https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/vas';

/**
 * Get list of all supported billers
 * This returns payment codes for each biller (like "10902" for electricity)
 */
export const getAvailableBillers = async () => {
  try {
    console.log('📡 Fetching available billers...');

    const headers = await getInterswitchHeaders();

    const response = await axios.get(`${MARKETPLACE_API}/billers`, {
      headers,
      timeout: 15000
    });

    console.log(`✅ Retrieved ${response.data?.length || 0} billers`);

    // Filter for electricity billers
    const electricityBillers = response.data?.filter(b =>
      b.billerName?.toLowerCase().includes('electric') ||
      b.billerName?.toLowerCase().includes('power') ||
      b.billerName?.toLowerCase().includes('electricity')
    ) || [];

    return {
      success: true,
      allBillers: response.data,
      electricityBillers,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Failed to fetch billers:', error.message);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * Validate customer (meter number) exists in the grid
 */
export const validateCustomer = async (customerId, paymentCode) => {
  try {
    console.log(`🔍 Validating customer ${customerId} with code ${paymentCode}`);

    const headers = await getInterswitchHeaders();

    const response = await axios.post(
      `${MARKETPLACE_API}/validate-customer`,
      [
        {
          customerId,
          paymentCode
        }
      ],
      {
        headers,
        timeout: 15000
      }
    );

    console.log(`✅ Customer validated: ${customerId}`);

    // Response format: Array with validation results
    const result = response.data?.[0];

    if (result?.customerName) {
      return {
        success: true,
        customerName: result.customerName,
        customerId: result.customerId,
        minimumAmount: result.minimumAmount,
        maximumAmount: result.maximumAmount,
        data: result
      };
    } else {
      return {
        success: false,
        error: 'Customer validation failed - meter not found in grid',
        data: result
      };
    }
  } catch (error) {
    console.error('❌ Customer validation error:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }

    return {
      success: false,
      error: error.response?.data?.message || error.message,
      data: error.response?.data
    };
  }
};

/**
 * Make payment for bills
 */
export const makePayment = async (customerId, amount, reference, paymentCode) => {
  try {
    console.log(`💳 Processing payment for ${customerId} - Amount: ${amount}, Ref: ${reference}`);

    const headers = await getInterswitchHeaders();

    const response = await axios.post(
      `${MARKETPLACE_API}/pay`,
      {
        customerId: customerId.toString(),
        amount: parseFloat(amount),
        reference: reference.toString(),
        paymentCode: paymentCode.toString()
      },
      {
        headers,
        timeout: 15000
      }
    );

    console.log(`✅ Payment processed: ${reference}`);

    if (response.data?.transactionReference || response.status === 200) {
      return {
        success: true,
        transactionRef: response.data?.transactionReference || reference,
        status: response.data?.status || 'Successful',
        amount,
        customerId,
        data: response.data
      };
    } else {
      return {
        success: false,
        error: response.data?.message || 'Payment failed',
        data: response.data
      };
    }
  } catch (error) {
    console.error('❌ Payment error:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }

    return {
      success: false,
      error: error.response?.data?.message || error.message,
      transactionRef: reference,
      data: error.response?.data
    };
  }
};

/**
 * Check payment transaction status
 */
export const checkTransactionStatus = async (requestReference) => {
  try {
    console.log(`🔍 Checking transaction status: ${requestReference}`);

    const headers = await getInterswitchHeaders();

    const response = await axios.get(
      `${MARKETPLACE_API}/transactions?request-reference=${requestReference}`,
      {
        headers,
        timeout: 15000
      }
    );

    console.log(`✅ Transaction status retrieved: ${requestReference}`);

    const transaction = response.data?.[0] || response.data;

    // Map status to our system
    let status = 'Pending';
    if (transaction?.status?.toLowerCase() === 'successful' || transaction?.responseCode === '00') {
      status = 'Successful';
    } else if (transaction?.status?.toLowerCase() === 'failed') {
      status = 'Failed';
    }

    return {
      success: status === 'Successful',
      status,
      transactionRef: requestReference,
      amount: transaction?.amount,
      data: transaction
    };
  } catch (error) {
    console.error('❌ Transaction check error:', error.message);

    return {
      success: false,
      status: 'Error',
      error: error.message,
      transactionRef: requestReference,
      data: null
    };
  }
};

/**
 * Get payment code for electricity
 * Automatically fetches from list and returns the appropriate code
 */
export const getElectricityPaymentCode = async () => {
  try {
    const billers = await getAvailableBillers();

    if (billers.electricityBillers?.length > 0) {
      // Get the first electricity biller's payment code
      const electricityBiller = billers.electricityBillers[0];
      console.log(`⚡ Using electricity biller: ${electricityBiller.billerName} (${electricityBiller.paymentCode})`);

      return {
        success: true,
        paymentCode: electricityBiller.paymentCode,
        billerName: electricityBiller.billerName
      };
    } else {
      // Fallback to common payment codes for electricity
      console.warn('⚠️ No electricity billers found, using fallback code');
      return {
        success: true,
        paymentCode: '10902', // Common electricity payment code
        billerName: 'Electricity (Fallback)',
        warning: 'Using fallback payment code'
      };
    }
  } catch (error) {
    console.error('Error getting electricity payment code:', error.message);
    return {
      success: false,
      error: error.message,
      paymentCode: '10902' // Fallback
    };
  }
};
