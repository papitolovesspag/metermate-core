# 🚀 COMPLETE SETUP & DEBUGGING GUIDE

## ✅ All Features Added

### 1. Delete Group Modal ✅ COMPLETE
- Created: `DeleteGroupModal.jsx` component
- Integrated into: `groupDetail.jsx`
- Replaces: `window.confirm()` alert
- Icon: 🗑️ (trash)
- Color: Red gradient (danger action)

### 2. Settlement Modal ✅ READY
- Added "View Breakdown" button
- Shows cost allocation for all members
- Click button to see modal

### 3. Leave Modal ✅ READY
- Click "Leave" button
- Shows beautiful modal (not alert)

---

## ⚙️ REQUIRED SETUP (MUST DO BEFORE TESTING)

### Step 1: Environment File Setup

Create `backend/.env.local`:

```env
# DATABASE (Update PASSWORD with your PostgreSQL password)
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/metermate

# INTERSWITCH QA Credentials
INTERSWITCH_CLIENT_ID=IKIA43F2ED234A6517A8DCA1B9ABAB40650DD50CD381
INTERSWITCH_CLIENT_SECRET=581CC6B55725F0ECB27F2E2A1037892C166CCD32
INTERSWITCH_PASSPORT_URL=https://qa.interswitchng.com/passport/oauth/token
INTERSWITCH_MARKETPLACE_API=https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/vas

# JWT Secret
JWT_SECRET=your_super_secret_key_change_this_in_production

# Environment
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
PYTHON_ENGINE_URL=http://localhost:8001
```

### Step 2: Start PostgreSQL

```bash
# On Windows (if installed)
net start PostgreSQL14

# Or check if already running:
psql -U postgres -d postgres -c "SELECT 1;"
```

### Step 3: Create Database

```bash
createdb metermate
```

---

## 🧪 TESTING FLOW

### Phase 1: Backend Only (5 minutes)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Expected Output:**
```
🚀 Server is running on port 5000

🔧 ===== INTERSWITCH QA CONFIGURATION =====
Client ID: ✅ Set (IKIA43F...)
Client Secret: ✅ Set (length: 40)
Passport URL: https://qa.interswitchng.com/passport/oauth/token
Marketplace API: https://api-marketplace-routing.k8.isw.la/marketplace-routing/api/v1/vas
=========================================

✅ Database tables are ready to go! All schemas initialized.
```

**Test Debug Endpoints:**
```bash
# Test token generation
curl http://localhost:5000/debug/test-token

# Test electricity code retrieval
curl http://localhost:5000/debug/electricity-code

# Test meter validation (replace METER with test meter number)
curl -X POST http://localhost:5000/debug/validate-meter/METER123456
```

### Phase 2: Python AI Engine (5 minutes)

**Check if Python installed:**
```bash
python --version  # Should be 3.8+
```

**Terminal 2 - Python Engine:**
```bash
cd python-engine
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8001
```

**Test Cost Calculation:**
```bash
curl -X POST http://localhost:8001/calculate/cost-allocation \
  -H "Content-Type: application/json" \
  -d '{
    "appliances": [
      {"user_id": "user1", "device_name": "AC", "wattage": 1500, "daily_hours": 2},
      {"user_id": "user2", "device_name": "Fan", "wattage": 500, "daily_hours": 4}
    ],
    "total_cost": 10000,
    "member_ids": ["user1", "user2"]
  }'
```

**Expected Response:**
```json
{
  "consumption_per_user": {
    "user1": 3.0,
    "user2": 2.0
  },
  "cost_per_user": {
    "user1": 6000.0,
    "user2": 4000.0
  },
  "percentage_per_user": {
    "user1": 60.0,
    "user2": 40.0
  },
  "total_consumption_kwh": 5.0,
  "total_cost": 10000.0
}
```

### Phase 3: Frontend (5 minutes)

**Terminal 3 - Frontend:**
```bash
cd metermate-frontend
npm run dev
```

**Expected Output:**
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

---

## 📝 Testing Modals

### Delete Group Modal
1. Login as group host
2. Open any group detail page
3. Click "Delete" button (top right)
4. Should see beautiful modal with trash icon
5. Click "Delete Group" to confirm
6. Modal disappears and navigates back

### Leave Group Modal
1. Login as group member (not host)
2. Open group detail page
3. Click "Leave" button (top right)
4. Should see beautiful modal with warning icon
5. Click "Leave Group" to confirm

### Settlement Modal
1. Go to group detail page
2. Look for "View Breakdown" button
3. Click it to see cost allocation
4. Shows breakdown for all members

---

## 💳 Testing Payment Flow

### What Needs to Work:

1. ✅ Initialize Payment Endpoint
2. ✅ Interswitch Payment Modal
3. ⏳ Meter Validation (NEEDS TEST METER)
4. ✅ Cost Calculation (Python)

### Test Payment Endpoint:

**Create test group with appliances:**
1. Login on http://localhost:5173
2. Create a group with target: ₦10,000
3. Add members
4. Each member adds appliances
5. Save appliances

**Then test payment:**
```bash
# Get your token from login response
# Test the initialize endpoint:
curl -X POST http://localhost:5000/api/payments/initialize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "group_id": "GROUP_UUID",
    "amount": 5000
  }'
```

**Expected Success Response:**
```json
{
  "message": "Payment initialized",
  "txn_ref": "MM-1234567890-a1b2c3d4",
  "amount": 5000
}
```

### If Payment Fails:

**Check these:**

1. **Backend not running?**
   ```
   Error: ECONNREFUSED
   Fix: npm run dev in backend folder
   ```

2. **Token not valid?**
   ```
   Error: 401 Unauthorized
   Fix: Re-login or check JWT secret in .env.local
   ```

3. **Group not found?**
   ```
   Error: 403 - Not a member of this group
   Fix: Use correct group_id, verify user is member
   ```

4. **Database error?**
   ```
   Error: relation "payments" does not exist
   Fix: Backend auto-creates tables, restart backend
   ```

---

## 🔍 Debugging Meter Validation

### Why Meter Validation Might Fail:

1. **Test meter doesn't exist in Interswitch QA**
   - ✗ Error: "Customer validation failed - meter not found in grid"
   - ✓ Solution: Get VALID test meter from Interswitch QA dashboard

2. **Interswitch API is down**
   - ✗ Error: ECONNRESET or ENOTFOUND
   - ✓ Solution: Check if Interswitch is available, has fallback

3. **Wrong endpoint configuration**
   - ✗ Error: 404 or invalid URL
   - ✓ Solution: Check `.env.local` has correct INTERSWITCH_MARKETPLACE_API

### Test Meter Validation:

```bash
# Get valid test meter from Interswitch QA
# Then test:
curl -X POST http://localhost:5000/debug/validate-meter/TEST_METER_123 \
  -H "Content-Type: application/json"
```

**Success Response:**
```json
{
  "success": true,
  "customerName": "Customer Name",
  "customerId": "TEST_METER_123",
  "minimumAmount": 1000,
  "maximumAmount": 100000,
  "data": {...}
}
```

**Error Response (Invalid Meter):**
```json
{
  "success": false,
  "error": "Customer validation failed - meter not found in grid",
  "data": null
}
```

---

## 📊 Testing Cost Allocation AI

### The Python Engine Provides:

1. **Consumption Calculation**
   - Input: Appliances (wattage, hours)
   - Output: Daily kWh per user
   - Formula: (Wattage / 1000) × Hours = kWh

2. **Cost Allocation**
   - Input: Total cost, appliance list, member list
   - Output: Exact naira per user
   - Handles: Equal split if no appliances
   - Handles: Remainder distribution (last user)

3. **Settlement Calculation**
   - Input: Costs, payments made
   - Output: Outstanding balance per user
   - Status: settled/pending/overpaid

### Test Full Cost Allocation:

Use the test script:
```bash
cd backend
node test-complete-flow.js
```

### Manual Test:

```bash
curl -X POST http://localhost:8001/calculate/cost-allocation \
  -H "Content-Type: application/json" \
  -d '{
    "appliances": [
      {
        "user_id": "chidi",
        "device_name": "Air Conditioner",
        "wattage": 1500,
        "daily_hours": 2
      },
      {
        "user_id": "john",
        "device_name": "Refrigerator",
        "wattage": 200,
        "daily_hours": 24
      },
      {
        "user_id": "mary",
        "device_name": "Electric Heater",
        "wattage": 3000,
        "daily_hours": 1
      }
    ],
    "total_cost": 15000,
    "member_ids": ["chidi", "john", "mary"]
  }'
```

**Calculation Details:**
- Chidi: 1500W × 2h = 3 kWh
- John: 200W × 24h = 4.8 kWh
- Mary: 3000W × 1h = 3 kWh
- **Total: 10.8 kWh**

**Cost Breakdown:**
- Chidi: (3/10.8) × 15000 = ₦4,166.67
- John: (4.8/10.8) × 15000 = ₦6,666.67
- Mary: (3/10.8) × 15000 = ₦4,166.67 (or remainder to = exactly 15000)

---

## ✅ Complete Testing Checklist

After setup, verify:

- [ ] Backend starts without errors
- [ ] Shows "✅ Token acquired" in logs
- [ ] Python engine running on port 8001
- [ ] Frontend loads on localhost:5173
- [ ] Can login successfully
- [ ] Create group works
- [ ] Add appliance works (integer hours only)
- [ ] Delete modal appears when clicking Delete
- [ ] Leave modal appears when clicking Leave
- [ ] View Breakdown button shows Settlement modal
- [ ] Cost calculation endpoint responds (Python)
- [ ] Payment initialize endpoint responds (Backend)
- [ ] No 500 errors in backend logs
- [ ] No errors in browser console

---

## 📋 All Endpoints Reference

### Payment Endpoints
```
POST /api/payments/initialize
  Body: { group_id, amount }
  Auth: Required (Bearer token)
  Response: { txn_ref, amount, message }

POST /api/payments/verify
  Body: { txn_ref }
  Auth: Required
  Response: { success, message }
```

### Debug Endpoints (Backend Testing)
```
GET /debug/test-token
  Response: { success, token (preview), tokenLength }

GET /debug/electricity-code
  Response: { paymentCode, billerName, success }

POST /debug/validate-meter/:meterNumber
  Response: { success, customerName, minimumAmount, maximumAmount }
```

### Python AI Engine Endpoints
```
GET / (Health check)
  Response: { status, service, version }

POST /calculate/consumption
  Body: { appliances }
  Response: { consumption_per_user, total_consumption_kwh, percentage_per_user }

POST /calculate/cost-allocation
  Body: { appliances, total_cost, member_ids }
  Response: { consumption_per_user, cost_per_user, percentage_per_user, total_consumption_kwh, total_cost }

POST /calculate/settlement
  Body: { total_cost, consumption_per_user, payments_made }
  Response: { cost_per_user, payments_made, outstanding_per_user, settlement_status }
```

---

## 🆘 Emergency Troubleshooting

### "Payment page won't load"
```
Check: npm run dev running in backend?
Check: npm run dev running in frontend?
Check: Port 5000 available?
Check: Port 5173 available?
```

### "Can't add appliances"
```
Check: Backend running? (npm run dev)
Check: Database connected? (check logs)
Check: Using INTEGER hours only (no decimals)
Check: All fields filled
```

### "Modals not showing"
```
Check: Restarted frontend after code changes?
Check: Hard refresh browser (Ctrl+Shift+R)
Check: No JavaScript errors in browser console
Check: CSS animations loading (DevTools → Styles)
```

### "Payment fails immediately"
```
Check: Backend token generation working?
Check: .env.local has correct Interswitch credentials?
Check: Database initialized?
Check: Check backend logs for detailed error
```

---

**Ready? Start with `npm run dev` in backend folder! 🚀**
