import axios from 'axios';
import { getInterswitchHeaders } from '../utils/interswitchAuth.js';

const QUICKTELLER_API =
  process.env.INTERSWITCH_QUICKTELLER_API || 'https://qa.interswitchng.com/quicktellerservice/api/v5';
const COLLECTIONS_API =
  process.env.INTERSWITCH_COLLECTIONS_API || 'https://qa.interswitchng.com/collections/api/v1';
const DEFAULT_ELECTRICITY_PAYMENT_CODE = process.env.INTERSWITCH_ELECTRICITY_PAYMENT_CODE || '10902';
const DEFAULT_TIMEOUT = 15000;

const requestWithFallback = async ({ method, attempts }) => {
  let lastError = null;

  for (const attempt of attempts) {
    try {
      if (method === 'GET') {
        const response = await axios.get(attempt.url, {
          headers: attempt.headers,
          timeout: attempt.timeout || DEFAULT_TIMEOUT
        });
        return response.data;
      }

      const response = await axios.post(attempt.url, attempt.payload, {
        headers: attempt.headers,
        timeout: attempt.timeout || DEFAULT_TIMEOUT
      });
      return response.data;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  throw new Error('Interswitch request failed');
};

export const getAvailableBillers = async () => {
  try {
    const headers = await getInterswitchHeaders();
    const data = await requestWithFallback({
      method: 'GET',
      attempts: [{ url: `${QUICKTELLER_API}/services`, headers }]
    });

    const billers = Array.isArray(data) ? data : [];
    const electricityBillers = billers.filter((biller) =>
      /electric|power|electricity/i.test(biller?.billerName || '')
    );

    return {
      success: true,
      allBillers: billers,
      electricityBillers
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      allBillers: [],
      electricityBillers: []
    };
  }
};

export const validateCustomer = async (customerId, paymentCode) => {
  try {
    const headers = await getInterswitchHeaders();
    const payloads = [
      [{ customerId, paymentCode }],
      { customerId, paymentCode },
      [{ customerId: String(customerId), paymentCode: String(paymentCode) }]
    ];

    const baseAttempts = [
      `${QUICKTELLER_API}/Transactions/validations`,
      `${QUICKTELLER_API}/validate-customer`,
      `${QUICKTELLER_API}/transactions/validations`
    ];

    const attempts = [];
    for (const url of baseAttempts) {
      for (const payload of payloads) {
        attempts.push({ url, payload, headers });
      }
    }

    const data = await requestWithFallback({ method: 'POST', attempts });
    const result = Array.isArray(data) ? data[0] : data;
    const customerName =
      result?.customerName || result?.fullName || result?.Customers?.[0]?.fullName || result?.Customers?.[0]?.customerName;

    if (!customerName) {
      return {
        success: false,
        error: 'Customer validation failed - meter not found in grid.',
        data: result
      };
    }

    return {
      success: true,
      customerName,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message
    };
  }
};

export const makePayment = async (customerId, amount, reference, paymentCode) => {
  try {
    const headers = await getInterswitchHeaders();
    const payloads = [
      {
        customerId: String(customerId),
        amount: Number(amount),
        requestReference: String(reference),
        paymentCode: String(paymentCode)
      },
      {
        customerId: String(customerId),
        amount: Number(amount),
        reference: String(reference),
        paymentCode: String(paymentCode)
      }
    ];

    const endpoints = [`${QUICKTELLER_API}/Transactions/payments`, `${QUICKTELLER_API}/pay`];
    const attempts = [];

    for (const url of endpoints) {
      for (const payload of payloads) {
        attempts.push({ url, payload, headers });
      }
    }

    const data = await requestWithFallback({ method: 'POST', attempts });

    const responseCode = data?.responseCode || data?.ResponseCode;
    const success = responseCode === '00' || responseCode === 0 || !!data?.transactionReference || !!data?.requestReference;

    return {
      success,
      transactionRef: data?.transactionReference || data?.requestReference || reference,
      status: success ? 'Successful' : 'Failed',
      data,
      error: success ? null : data?.responseDescription || data?.message || 'Payment failed'
    };
  } catch (error) {
    return {
      success: false,
      transactionRef: reference,
      error: error.response?.data?.message || error.response?.data?.error || error.message,
      data: error.response?.data
    };
  }
};

export const checkTransactionStatus = async (requestReference) => {
  const merchantCode = process.env.INTERSWITCH_MERCHANT_CODE;

  try {
    const headers = await getInterswitchHeaders();
    const attempts = [];

    if (merchantCode) {
      attempts.push({
        url: `${COLLECTIONS_API}/gettransaction.json?merchantcode=${merchantCode}&transactionreference=${requestReference}`,
        headers
      });
    }

    attempts.push({
      url: `${QUICKTELLER_API}/transactions?request-reference=${requestReference}`,
      headers
    });

    const data = await requestWithFallback({ method: 'GET', attempts });
    const raw = Array.isArray(data) ? data[0] : data;
    const responseCode = String(raw?.responseCode ?? raw?.ResponseCode ?? '').trim();
    const statusText = String(raw?.status || raw?.ResponseDescription || '').toLowerCase();

    const isSuccessful =
      responseCode === '00' ||
      statusText.includes('successful') ||
      statusText.includes('approved');

    return {
      success: isSuccessful,
      status: isSuccessful ? 'Successful' : 'Pending',
      transactionRef: requestReference,
      amount: raw?.amount,
      data: raw
    };
  } catch (error) {
    return {
      success: false,
      status: 'Error',
      error: error.response?.data?.message || error.message,
      transactionRef: requestReference
    };
  }
};

export const getElectricityPaymentCode = async () => {
  if (process.env.INTERSWITCH_ELECTRICITY_PAYMENT_CODE) {
    return {
      success: true,
      paymentCode: process.env.INTERSWITCH_ELECTRICITY_PAYMENT_CODE,
      billerName: 'Configured Electricity Biller'
    };
  }

  const billers = await getAvailableBillers();
  if (billers.success && billers.electricityBillers.length > 0) {
    const electricityBiller = billers.electricityBillers[0];
    return {
      success: true,
      paymentCode: electricityBiller.paymentCode,
      billerName: electricityBiller.billerName
    };
  }

  return {
    success: true,
    paymentCode: DEFAULT_ELECTRICITY_PAYMENT_CODE,
    billerName: 'Electricity (Fallback)'
  };
};
