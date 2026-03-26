# 🐍 PYTHON ENGINE SETUP & DEBUG GUIDE

## Why You're Seeing Equal Splits ❌

The backend is trying to call the Python engine to calculate costs based on electricity usage, but if the Python engine is:
- ❌ Not running
- ❌ Not reachable at `http://localhost:8001`
- ❌ Not installed

**Then it falls back to equal splits!**

---

## Step 1: Install Python 3.8+

**Check if Python is installed:**
```bash
python --version
```

Should show: `Python 3.8.x` or higher

**If Python is not installed:**
1. Download from https://www.python.org/downloads/
2. **IMPORTANT:** During installation, check "Add Python to PATH"
3. Restart your terminal

---

## Step 2: Setup Python Virtual Environment

**In a NEW terminal window:**

```bash
# Navigate to python-engine folder
cd python-engine

# Create virtual environment
python -m venv venv

# Activate it (Windows)
venv\Scripts\activate

# Activate it (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

You should see `(venv)` at the start of your terminal prompt.

---

## Step 3: Start Python Engine

**In the activated terminal (with venv):**

```bash
python main.py
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8001 (Press CTRL+C to quit)
```

**Keep this running!** Do NOT close this window.

---

## Step 4: Test Python Engine (New Terminal)

Open a NEW terminal and run:

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File test-python-engine.ps1
```

**Mac/Linux (Bash):**
```bash
bash test-python-engine.sh
```

Should show:
- ✅ Python installed
- ✅ Python engine running
- ✅ Cost calculation working

---

## Step 5: Verify 3 Terminals Running

You should now have **3 terminals** open:

| Terminal | Command | Status |
|----------|---------|--------|
| 1 | `cd backend && npm run dev` | Backend on port 5000 |
| 2 | `cd python-engine && python main.py` | Python on port 8001 |
| 3 | `cd metermate-frontend && npm run dev` | Frontend on port 5173 |

**All three must be running!**

---

## Step 6: Check Backend Configuration

**File:** `backend/.env.local`

Must include:
```env
PYTHON_ENGINE_URL=http://localhost:8001
```

If not there, add it.

---

## Step 7: Test Cost Calculation in App

1. Open http://localhost:5173
2. Login to app
3. Create a group with target: **₦10,000**
4. Add appliances for different users:
   - User 1: Air Conditioner (1500W) × 2 hours
   - User 2: Fan (500W) × 4 hours
5. Click "View Breakdown"

**Expected Breakdown:**
```
User 1: ₦6,000 (3 kWh ÷ 5 kWh total = 60%)
User 2: ₦4,000 (2 kWh ÷ 5 kWh total = 40%)
```

**If you see:**
- ✅ User 1: ₦6,000 and User 2: ₦4,000 → **WORKING!** 🎉
- ❌ User 1: ₦5,000 and User 2: ₦5,000 → **PYTHON ENGINE NOT CONNECTED** ❌

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'fastapi'"
```
Check: Is venv activated? (should show (venv) in terminal)
Fix: Run: pip install -r requirements.txt
```

### "Address already in use" on port 8001
```
Check: Is another Python process running?
Fix: Close other terminals or run: lsof -ti:8001 | xargs kill -9
```

### "Connection refused" to localhost:8001
```
Check: Is Python engine terminal running?
Check: Does it show "Uvicorn running on http://127.0.0.1:8001"?
Fix: Restart Python engine with: python main.py
```

### Backend shows "Python engine error"
```
Check logs for exact error
Verify PYTHON_ENGINE_URL in .env.local
Restart backend: npm run dev
```

### Still showing equal splits after Python is running
```
1. Restart backend: npm run dev
2. Try adding new appliances
3. Click "View Breakdown" again
4. Should now show usage-based split
```

---

## Debug Endpoint

Test Python engine directly:

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

Should return:
```json
{
  "cost_per_user": {
    "user1": 6000.0,
    "user2": 4000.0
  },
  "consumption_per_user": {
    "user1": 3.0,
    "user2": 2.0
  },
  "percentage_per_user": {
    "user1": 60.0,
    "user2": 40.0
  },
  "total_consumption_kwh": 5.0,
  "total_cost": 10000.0
}
```

---

## Quick Checklist

Before testing:
- [ ] Python 3.8+ installed
- [ ] Virtual environment created and activated
- [ ] `python main.py` running
- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] `.env.local` has `PYTHON_ENGINE_URL=http://localhost:8001`
- [ ] No errors in backend logs

If all ✅, close the app and reopen, then test the breakdown again!

---

**Questions? Run:**
```bash
node backend/test-complete-flow.js
```

This will test all three systems (Backend, Python, Integration).
