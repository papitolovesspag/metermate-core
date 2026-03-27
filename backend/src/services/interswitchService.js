import { checkTransactionStatus, validateCustomer } from './billsPaymentService.js';

export const verifyPaymentWithInterswitch = async (txn_ref) => {
  try {
    const result = await checkTransactionStatus(txn_ref);
    if (result.success) {
      return {
        success: true,
        amount: result.amount,
        status: result.status,
        data: result.data
      };
    }

    return {
      success: false,
      status: result.status || 'Failed',
      error: result.error || 'Payment verification failed'
    };
  } catch (error) {
    const demoMode = process.env.INTERSWITCH_DEMO_MODE === 'true';
    return {
      success: demoMode,
      status: demoMode ? 'DemoSuccess' : 'Error',
      error: error.message
    };
  }
};

export const validateMeterWithInterswitch = async (meterNumber, paymentCode) => {
  try {
    const result = await validateCustomer(meterNumber, paymentCode);
    if (result.success) {
      return {
        success: true,
        customerName: result.customerName,
        data: result.data
      };
    }

    return {
      success: false,
      error: result.error || 'Invalid meter number'
    };
  } catch (error) {
    const demoMode = process.env.INTERSWITCH_DEMO_MODE === 'true';
    return {
      success: demoMode,
      customerName: demoMode ? 'Sandbox Customer' : null,
      error: demoMode ? null : error.message
    };
  }
};

export const verifyPaymentWithRetry = async (txn_ref, maxRetries = 1) => {
  let lastResult = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const result = await verifyPaymentWithInterswitch(txn_ref);
    if (result.success) {
      return result;
    }
    lastResult = result;

    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return lastResult || { success: false, error: 'Payment verification failed' };
};
