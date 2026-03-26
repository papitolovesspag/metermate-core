# Interswitch Integration - MeterMate QA Environment Setup

## ✅ Your Credentials (KEEP ME SAFE!)

```
CLIENT_ID: IKIA43F2ED234A6517A8DCA1B9ABAB40650DD50CD381
CLIENT_SECRET: 581CC6B55725F0ECB27F2E2A1037892C166CCD32
```

**Important:** Store these in `.env.local` securely, NEVER commit to git!

---

## 🔧 Environment Setup

### Update `.env.local` with these values:

```env
# Interswitch QA Credentials
INTERSWITCH_CLIENT_ID=IKIA43F2ED234A6517A8DCA1B9ABAB40650DD50CD381
INTERSWITCH_CLIENT_SECRET=581CC6B55725F0ECB27F2E2A1037892C166CCD32

# Interswitch QA Endpoints (Bills Payment VAS)
INTERSWITCH_PASSPORT_URL=https://qa.interswitchng.com/passport/oauth/token
INTERSWITCH_MARKETPLACE_API=https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/vas
```

### Backend: Add to `backend/src/server.js`

```javascript
import { debugInterswitchConfig } from './utils/interswitchAuth.js';

// On server startup:
app.listen(5000, () => {
  console.log('🚀 Backend running on port 5000');
  debugInterswitchConfig(); // Shows config status
});
```

---

## 📡 The Correct Payment Flow

### 1️⃣ Get OAuth Token
**Endpoint:** `POST https://qa.interswitchng.com/passport/oauth/token`

```bash
curl --location 'https://qa.interswitchng.com/passport/oauth/token' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --header 'Authorization: Basic <BASE64(CLIENT_ID:CLIENT_SECRET)>' \
  --data-urlencode 'grant_type=client_credentials' \
  --data-urlencode 'scope=profile'
```

**Response:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 2️⃣ Get Available Billers
**Endpoint:** `GET https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/vas/billers`

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Response:**
```json
[
  {
    "billerId": 520,
    "billerName": "Electricity Distribution Company",
    "paymentCode": "10902",
    "category": "Utilities"
  },
  ...
]
```

**Find:** Filter for electricity/power billers → Get their `paymentCode` (e.g., `10902`)

### 3️⃣ Validate Customer (Meter Number)
**Endpoint:** `POST https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/vas/validate-customer`

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
[
  {
    "customerId": "070655456765",    // Meter number (must exist in grid!)
    "paymentCode": "10902"            // From billers endpoint
  }
]
```

**Response:**
```json
[
  {
    "customerId": "070655456765",
    "customerName": "John Doe",
    "address": "123 Power Lane, Lagos",
    "minimumAmount": 1000,
    "maximumAmount": 500000
  }
]
```

**What this checks:**
✅ Meter number exists in the grid
✅ Customer is registered
✅ Gets min/max payment amounts
❌ Returns error if meter doesn't exist = "bad credentials"

### 4️⃣ Make Payment
**Endpoint:** `POST https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/vas/pay`

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "customerId": "070655456765",
  "amount": 5000,                    // Amount in Naira
  "reference": "MM-1234567890",      // Your unique reference
  "paymentCode": "10902"
}
```

**Response:**
```json
{
  "transactionReference": "INT-1234567890",
  "status": "Successful",
  "amount": 5000,
  "reference": "MM-1234567890"
}
```

### 5️⃣ Check Transaction Status
**Endpoint:** `GET https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/vas/transactions?request-reference=MM-1234567890`

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Response:**
```json
[
  {
    "requestReference": "MM-1234567890",
    "status": "Successful",
    "amount": 5000,
    "customerId": "070655456765",
    "timestamp": "2024-03-25T10:30:00Z"
  }
]
```

---

## 🔍 Debugging "Bad Credentials" Error

**What causes it:** Meter validation fails because:
1. Meter number doesn't exist in the grid
2. Meter number format is incorrect
3. Authentication token failed

**Fix Steps:**

**1. Verify Your Credentials Work**
```bash
# Get token to test
curl -X POST 'https://qa.interswitchng.com/passport/oauth/token' \
  -H 'Authorization: Basic <your_base64_credentials>' \
  -d 'grant_type=client_credentials&scope=profile'
```

If this fails → Your Client ID/Secret are incorrect!

**2. Get Valid Test Meter Numbers**
Contact Interswitch support or check your QA dashboard for valid test meter numbers.

**3. Get Electricity Payment Code**
Make sure you're using the correct `paymentCode` for electricity (usually `10902`).

**4. Test Meter Validation**
```bash
curl -X POST 'https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/vas/validate-customer' \
  -H 'Authorization: Bearer <valid_token>' \
  -H 'Content-Type: application/json' \
  -d '[{"customerId": "YOUR_METER_NUMBER", "paymentCode": "10902"}]'
```

If meter doesn't exist → You'll get error. Use only valid test meters!

---

## 🚀 MeterMate Implementation

### Updated Services:

1. **`backend/src/utils/interswitchAuth.js`** - OAuth token generation
2. **`backend/src/services/billsPaymentService.js`** (NEW) - Bills payment operations:
   - `getAvailableBillers()` - Get list of billers
   - `validateCustomer()` - Validate meter number
   - `makePayment()` - Process payment
   - `checkTransactionStatus()` - Check payment status
   - `getElectricityPaymentCode()` - Get electricity payment code automatically

### Updated Frontend:

1. **`metermate-frontend/src/pages/groupDetail.jsx`** (UPDATED):
   - Appliance dropdown selector (no wattage input needed!)
   - Auto-calculated wattage from appliance categories
   - User-friendly device selection

---

## ✅ Testing Checklist

- [ ] Update `.env.local` with credentials
- [ ] Start backend server, verify `debugInterswitchConfig()` shows credentials
- [ ] Test token generation
- [ ] Get list of available billers
- [ ] Find electricity biller and its payment code
- [ ] Get valid test meter numbers from Interswitch
- [ ] Test meter validation with valid meter
- [ ] Test payment flow
- [ ] Check transaction status

---

## 📚 Additional Resources

- **Interswitch Bills Payment Docs:** https://docs.interswitchgroup.com/docs/bills-payment-1
- **Customer Validation Docs:** https://docs.interswitchgroup.com/docs/customervalidations
- **QA Dashboard:** Check for test meter numbers and configuration

---

## 💡 Key Points

✅ **Use Bearer Token** (not MAC signatures like old API)
✅ **Scope must include "profile"** for OAuth
✅ **Meter numbers must be valid** in the grid (ask Interswitch for test meters)
✅ **Payment codes are per-biller** (electricity uses 10902)
✅ **User doesn't input wattage** anymore - dropdown handles it!

---

## 🆘 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Bad Credentials" on meter validation | Meter doesn't exist in grid | Use valid test meter numbers only |
| Token request fails | Client ID/Secret wrong | Verify credentials in .env |
| Payment fails after validation | Amount out of range | Check min/max from validation response |
| Status always "Pending" | Token expired | Request fresh token for each request |

---

## 📝 Next Steps

1. ✅ Add credentials to `.env.local`
2. ✅ Get valid test meter numbers from Interswitch QA dashboard
3. ✅ Test authentication endpoint
4. ✅ Update backend payment controller to use new service
5. ✅ Test full payment flow in MeterMate UI
