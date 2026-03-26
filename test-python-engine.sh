#!/bin/bash

# test-python-engine.sh - Debug Python engine connection

echo "======================================"
echo "🐍 PYTHON ENGINE DEBUG TEST"
echo "======================================"
echo ""

# Test 1: Check if Python is installed
echo "📋 TEST 1: Python Installation"
echo "──────────────────────────────"
python --version 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Python not found or not in PATH"
  echo "Install Python 3.8+ from https://www.python.org"
  exit 1
fi
echo "✅ Python installed"
echo ""

# Test 2: Check .env.local in backend
echo "📋 TEST 2: Backend .env.local"
echo "────────────────────────────"
if [ -f "backend/.env.local" ]; then
  echo "✅ .env.local found"
  if grep -q "PYTHON_ENGINE_URL" backend/.env.local; then
    ENGINE_URL=$(grep "PYTHON_ENGINE_URL" backend/.env.local | cut -d'=' -f2)
    echo "   URL: $ENGINE_URL"
  else
    echo "⚠️  PYTHON_ENGINE_URL not in .env.local (using default: http://localhost:8001)"
  fi
else
  echo "⚠️  .env.local not found (using default: http://localhost:8001)"
fi
echo ""

# Test 3: Check if Python engine is responding
echo "📋 TEST 3: Python Engine Health Check"
echo "────────────────────────────────────"
echo "Attempting to reach http://localhost:8001..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/)
if [ "$RESPONSE" = "200" ]; then
  echo "✅ Python engine is running and responding!"
else
  echo "❌ Python engine NOT responding (HTTP $RESPONSE)"
  echo ""
  echo "To start Python engine:"
  echo "  cd python-engine"
  echo "  python -m venv venv"
  echo "  # On Windows:"
  echo "  venv\\Scripts\\activate"
  echo "  # On Mac/Linux:"
  echo "  source venv/bin/activate"
  echo "  pip install -r requirements.txt"
  echo "  python main.py"
  exit 1
fi
echo ""

# Test 4: Test cost calculation endpoint
echo "📋 TEST 4: Cost Calculation Endpoint"
echo "───────────────────────────────────"
echo "Testing POST /calculate/cost-allocation..."
CALC_RESPONSE=$(curl -s -X POST http://localhost:8001/calculate/cost-allocation \
  -H "Content-Type: application/json" \
  -d '{
    "appliances": [
      {"user_id": "user1", "device_name": "AC", "wattage": 1500, "daily_hours": 2},
      {"user_id": "user2", "device_name": "Fan", "wattage": 500, "daily_hours": 4}
    ],
    "total_cost": 10000,
    "member_ids": ["user1", "user2"]
  }')

echo "Response:"
echo "$CALC_RESPONSE" | jq '.' 2>/dev/null || echo "$CALC_RESPONSE"

# Check if calculation looks correct
if echo "$CALC_RESPONSE" | grep -q "cost_per_user"; then
  USER1_COST=$(echo "$CALC_RESPONSE" | jq '.cost_per_user.user1' 2>/dev/null)
  USER2_COST=$(echo "$CALC_RESPONSE" | jq '.cost_per_user.user2' 2>/dev/null)

  # User1: 1500W * 2h = 3000 Wh = 3 kWh
  # User2: 500W * 4h = 2000 Wh = 2 kWh
  # Total: 5 kWh
  # User1 should get: (3/5) * 10000 = 6000
  # User2 should get: (2/5) * 10000 = 4000

  echo ""
  echo "Expected Costs:"
  echo "  User1 (3kWh): ₦6000"
  echo "  User2 (2kWh): ₦4000"
  echo ""
  echo "Actual Costs:"
  echo "  User1: ₦$USER1_COST"
  echo "  User2: ₦$USER2_COST"

  if [ "$USER1_COST" = "6000" ] && [ "$USER2_COST" = "4000" ]; then
    echo "✅ Cost calculation working correctly!"
  else
    echo "❌ Cost calculation NOT working (should be 6000 and 4000)"
  fi
else
  echo "❌ No cost_per_user in response - engine error"
fi
echo ""

echo "======================================"
echo "✅ PYTHON ENGINE TEST COMPLETE"
echo "======================================"
