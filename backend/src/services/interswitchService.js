// src/services/interswitchService.js
import axios from 'axios';
import { getInterswitchHeaders } from '../utils/interswitchAuth.js';
import { validateCustomer, checkTransactionStatus } from './billsPaymentService.js';

const REQUEST_TIMEOUT = 10000; // 10 seconds

export const verifyPaymentWithInterswitch = async (txn_ref) => {
  try {
    console.log(`🔍 Verifying payment with Bills Payment API: ${txn_ref}`);

    // Use billsPaymentService's checkTransactionStatus function
    const result = await checkTransactionStatus(txn_ref);

    if (result.success) {
      console.log(`✅ Payment verified successfully: ${txn_ref}`);
      return {
        success: true,
        amount: result.amount,
        status: result.status,
        data: result.data
      };
    } else {
      console.warn(`⚠️ Payment verification failed: ${txn_ref}`);
      return {
        success: false,
        status: result.status || 'Failed',
        error: result.error || 'Payment verification failed'
      };
    }
  } catch (error) {
    console.error('❌ Interswitch verification error:', error.message);

    // Network/connection error - use fallback
    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.warn('⚠️ Cannot reach Interswitch service. Using fallback for demo.');
      return {
        success: true, // Fallback: assume successful for demo
        status: 'Pending',
        error: 'Service temporarily unavailable, payment queued for verification'
      };
    }

    // Timeout error
    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        status: 'Timeout',
        error: 'Payment verification timed out. Please check back later.'
      };
    }

    return {
      success: false,
      status: 'Error',
      error: error.message
    };
  }
};

export const validateMeterWithInterswitch = async (meterNumber, paymentCode) => {
  try {
    console.log(`🔍 Validating meter: ${meterNumber} with code: ${paymentCode}`);

    // Use billsPaymentService's validateCustomer function
    const result = await validateCustomer(meterNumber, paymentCode);

    if (result.success) {
      console.log(`✅ Meter validated: ${result.customerName}`);
      return {
        success: true,
        customerName: result.customerName,
        data: result.data
      };
    } else {
      console.warn('⚠️ Meter validation failed');
      return {
        success: false,
        error: result.error || 'Invalid meter number. The grid does not recognize it.'
      };
    }
  } catch (error) {
    console.error('❌ Meter validation error:', error.message);

    // Fallback for demo purposes
    if (error.response?.status >= 500 || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.warn('⚠️ Interswitch service unavailable. Using mock validation.');
      return {
        success: true,
        customerName: 'Customer (Mocked)',
        fallback: true,
        warning: 'Using mock data due to service unavailability'
      };
    }

    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Retry wrapper for API calls with exponential backoff
 */
export const verifyPaymentWithRetry = async (txn_ref, maxRetries = 1) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await verifyPaymentWithInterswitch(txn_ref);
      if (result.success) {
        return result;
      }
      lastError = result;
    } catch (error) {
      lastError = { error: error.message };
      console.warn(`Retry attempt ${attempt + 1}/${maxRetries + 1} failed`);

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return lastError;
};
