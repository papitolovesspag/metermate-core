# Interswitch API Integration Guide - MeterMate

## Common Issues & Solutions

### Issue 1: "Interface Integration Error"
**Possible Causes:**
- MAC signature validation failed
- Request headers are missing or malformed
- URL encoding mismatch
- Terminal ID doesn't match credentials

**Solution:**
```env
# Ensure .env.local has these exact values from Interswitch dashboard:
INTERSWITCH_CLIENT_ID=your_client_id
INTERSWITCH_SECRET_KEY=your_secret_key
INTERSWITCH_TERMINAL_ID=your_terminal_id  # Get from Settings > Terminals
INTERSWITCH_API_URL=https://sandbox.interswitchng.com/api/v2  # for testing
INTERSWITCH_PASSPORT_URL=https://sandbox.interswitchng.com/api/v1.0/oauth/token
```

### Issue 2: "Bad Credentials" Error
**Possible Causes:**
- Client ID and Secret Key not trimmed (whitespace issues)
- Credentials expired or revoked
- Wrong Terminal ID
- Timestamp is too far off from server (clock skew)

**Solution:**
1. Verify credentials in Interswitch dashboard
2. Check if Terminal ID matches your configured credentials
3. Ensure server time is synchronized (NTP)
4. Test with sandbox credentials first

---

## Interswitch Payment APIs

### 1. Payment Collection API (For Electricity Bill Payment)

**Endpoint:** `POST /quickteller/payments/collect`

**Use Case:** When a user wants to pay for electricity

```javascript
// Request Body
{
  "customerId": "1234567890",      // Meter number
  "amount": 5000,                   // Amount in Naira
  "paymentCode": "ELECTRICITY",     // Fixed for electricity
  "currencyCode": "566",            // NGN
  "description": "Electricity bill for meter 1234567890",
  "transactionRef": "MM-1234567890" // Your transaction ID
}

// Response
{
  "ResponseCode": "00",
  "ResponseDescription": "Payment successful",
  "transactionRef": "MM-1234567890",
  "responseCode": 0,
  "responseDescription": "Successful",
  "requestData": {...}
}
```

### 2. Customer Validation API

**Endpoint:** `GET /quickteller/customers/validations?customerId={meter_number}&paymentCode=ELECTRICITY`

**Use Case:** Verify meter number exists in the grid before accepting payment

```javascript
// Request Headers
{
  'Authorization': 'Bearer {access_token}',
  'Signature': '{mac_signature}',
  'SignatureMethod': 'SHA-256',
  'Timestamp': '{unix_timestamp}',
  'Nonce': '{random_string}',
  'TerminalId': '{terminal_id}'
}

// Response
{
  "Customers": [
    {
      "customerId": "1234567890",
      "fullName": "John Doe",
      "phoneNumber": "08012345678",
      "address": "Lagos",
      "outstandingBalance": 0,
      "minimumAmount": 1000,
      "maximumAmount": 100000
    }
  ]
}
```

### 3. Payment Verification API

**Endpoint:** `GET /quickteller/payments/{transaction_ref}`

**Use Case:** Check if payment was successful after user completes payment flow

```javascript
// Request Headers (same as above)

// Response
{
  "ResponseCode": "00",
  "amount": 5000,
  "transactionDate": "2024-03-25T10:30:00Z",
  "paymentCode": "ELECTRICITY",
  "customerId": "1234567890",
  "status": "Successful"
}
```

---

## VAS (Value Added Services)

### What is VAS?
VAS Integration allows automated top-up without user interaction (subscription-like model)

### 3-in-1 VAS Integration Endpoint
**Endpoint:** `POST /quickteller/vas/3in1`

```javascript
// This endpoint combines:
// 1. Customer validation
// 2. Payment collection
// 3. Service delivery (immediate credit)

// Request
{
  "customerId": "1234567890",
  "transactionRef": "MM-1234567890",
  "amount": 5000,
  "paymentCode": "ELECTRICITY",
  "currencyCode": "566",
  "description": "Meter top-up",
  "paymentMethod": "INTERSWITCH"  // or "CARD", "BANK"
}
```

### When to Use VAS vs Regular Payment:
- **Regular Payment**: When user manually initiates payment (current approach - RECOMMENDED)
- **VAS**: When you want automatic recurring payments (Advanced, requires subscription setup)

---

## Debugging Checklist

```javascript
// Add this to your interswitchAuth.js for debugging:

export const debugInterswitchConfig = () => {
  console.log('=== INTERSWITCH CONFIG DEBUG ===');
  console.log(`Client ID: ${CLIENT_ID ? "✅ Set" : "❌ Missing"}`);
  console.log(`Secret Key: ${SECRET_KEY ? "✅ Set" : "❌ Missing"}`);
  console.log(`Terminal ID: ${TERMINAL_ID ? "✅ Set" : "❌ Missing"}`);
  console.log(`Passport URL: ${PASSPORT_URL}`);
  console.log(`API URL: ${process.env.INTERSWITCH_API_URL}`);
  console.log(`Current Unix Timestamp: ${Math.floor(Date.now() / 1000)}`);
  console.log('================================');
};

// Then in your payment controller:
import { debugInterswitchConfig } from '../utils/interswitchAuth.js';

// Call on startup
debugInterswitchConfig();
```

---

## Step-by-Step Implementation Fix

### Step 1: Update `.env.local`
```env
INTERSWITCH_CLIENT_ID=your_actual_client_id
INTERSWITCH_SECRET_KEY=your_actual_secret_key
INTERSWITCH_TERMINAL_ID=3TLP0001
INTERSWITCH_API_URL=https://sandbox.interswitchng.com/api/v2
INTERSWITCH_PASSPORT_URL=https://sandbox.interswitchng.com/api/v1.0/oauth/token
```

### Step 2: Test Token Generation
```javascript
// In your backend, add this test endpoint temporarily:
app.get('/debug/interswitch-token', async (req, res) => {
  try {
    const token = await getInterswitchToken();
    res.json({ success: true, token, note: 'Token successfully generated' });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});
```

### Step 3: Validate Meter with Proper Headers
```javascript
// Test endpoint to validate a meter
app.post('/debug/validate-meter/:meterNumber', async (req, res) => {
  try {
    const result = await validateMeterWithInterswitch(req.params.meterNumber, 'ELECTRICITY');
    res.json(result);
  } catch (error) {
    res.json({ error: error.message });
  }
});
```

---

## Payment Collection (Current Best Approach)

### Why We Use Payment Collection API (Not VAS):
✅ **Better for MeterMate:**
- User initiates payment manually
- More control over transaction flow
- No recurring subscription setup needed
- Simpler integration
- Better error handling and retries
- User sees clear payment status

❌ **Avoid VAS for now:**
- Requires subscription setup
- Needs pre-authorization
- More complex compliance requirements
- Not ideal for one-time utility payments

---

## Recommended Testing Flow

1. **Check Environment Variables**
   ```bash
   # Verify .env.local has correct values
   ```

2. **Test Token Generation**
   ```bash
   curl -X GET http://localhost:5000/debug/interswitch-token
   ```

3. **Test Meter Validation**
   ```bash
   curl -X POST http://localhost:5000/debug/validate-meter/1234567890
   ```

4. **Test Full Payment Flow**
   - Go to MeterMate UI
   - Create a group with a valid meter number
   - Try to pay for electricity
   - Check server logs for exact error codes from Interswitch

---

## FAQ

**Q: Should I use Payment Collection or VAS?**
A: Use Payment Collection (current approach) for now. VAS is for advanced recurring payments.

**Q: Why is meter validation failing?**
A: Common causes:
   1. Meter number format incorrect (must be valid for the grid)
   2. MAC signature generation error
   3. Timestamp mismatch (server clock skew)
   4. Terminal ID mismatch

**Q: How long should I wait for payment verification?**
A: Current implementation retries once after 1 second if timeout. Increase `maxRetries` parameter if needed.

---

## Resources

- **Interswitch Developer Docs:** https://sandbox.interswitchng.com/docs
- **Test Meter Numbers:** Usually provided in Interswitch sandbox dashboard
- **Integration Support:** support@interswitchng.com
