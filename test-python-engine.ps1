# Python Engine Debug - Windows PowerShell
# Run with: powershell -ExecutionPolicy Bypass -File test-python-engine.ps1

Write-Host "======================================"
Write-Host "🐍 PYTHON ENGINE DEBUG TEST" -ForegroundColor Cyan
Write-Host "======================================"
Write-Host ""

# TEST 1: Python Installation
Write-Host "📋 TEST 1: Python Installation" -ForegroundColor Yellow
Write-Host "──────────────────────────────"
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Python not found or not in PATH" -ForegroundColor Red
    Write-Host "Install Python 3.8+ from https://www.python.org"
    exit 1
}
else {
    Write-Host "✅ $pythonVersion" -ForegroundColor Green
}
Write-Host ""

# TEST 2: Check .env.local
Write-Host "📋 TEST 2: Backend .env.local" -ForegroundColor Yellow
Write-Host "────────────────────────────"
$envPath = "backend\.env.local"
if (Test-Path $envPath) {
    Write-Host "✅ .env.local found" -ForegroundColor Green
    $pythonUrl = Select-String "PYTHON_ENGINE_URL" $envPath | ForEach-Object { $_.Line.Split("=")[1] }
    if ($pythonUrl) {
        Write-Host "   URL: $pythonUrl" -ForegroundColor Gray
    }
    else {
        Write-Host "⚠️  PYTHON_ENGINE_URL not in .env.local (using default: http://localhost:8001)" -ForegroundColor Yellow
    }
}
else {
    Write-Host "⚠️  .env.local not found (using default: http://localhost:8001)" -ForegroundColor Yellow
}
Write-Host ""

# TEST 3: Check if Python engine is running
Write-Host "📋 TEST 3: Python Engine Health Check" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────"
Write-Host "Checking http://localhost:8001/..."

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001/" -TimeoutSec 2 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Python engine is RUNNING and responding!" -ForegroundColor Green
        Write-Host "   Response: $($response.Content | ConvertFrom-Json | ConvertTo-Json -Compress)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "❌ Python engine NOT RESPONDING" -ForegroundColor Red
    Write-Host ""
    Write-Host "To start Python engine, open a NEW terminal and run:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  cd python-engine" -ForegroundColor Cyan
    Write-Host "  python -m venv venv" -ForegroundColor Cyan
    Write-Host "  venv\Scripts\activate" -ForegroundColor Cyan
    Write-Host "  pip install -r requirements.txt" -ForegroundColor Cyan
    Write-Host "  python main.py" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter to continue..."
}
Write-Host ""

# TEST 4: Test cost calculation
Write-Host "📋 TEST 4: Cost Calculation Endpoint" -ForegroundColor Yellow
Write-Host "───────────────────────────────────"
Write-Host "Testing POST /calculate/cost-allocation..."
Write-Host ""

$testPayload = @{
    appliances = @(
        @{
            user_id = "user1"
            device_name = "Air Conditioner"
            wattage = 1500
            daily_hours = 2
        },
        @{
            user_id = "user2"
            device_name = "Fan"
            wattage = 500
            daily_hours = 4
        }
    )
    total_cost = 10000
    member_ids = @("user1", "user2")
} | ConvertTo-Json

try {
    $calcResponse = Invoke-WebRequest -Uri "http://localhost:8001/calculate/cost-allocation" `
        -Method POST `
        -ContentType "application/json" `
        -Body $testPayload `
        -TimeoutSec 5 `
        -ErrorAction Stop

    $result = $calcResponse.Content | ConvertFrom-Json

    Write-Host "✅ Response received:" -ForegroundColor Green
    Write-Host ($result | ConvertTo-Json -Depth 10) -ForegroundColor Gray
    Write-Host ""

    $user1Cost = $result.cost_per_user.user1
    $user2Cost = $result.cost_per_user.user2

    Write-Host "Calculation Details:" -ForegroundColor Cyan
    Write-Host "  User1 (AC): 1500W × 2h = 3 kWh → (3/5) × ₦10000 = ₦6000"
    Write-Host "  User2 (Fan): 500W × 4h = 2 kWh → (2/5) × ₦10000 = ₦4000"
    Write-Host ""
    Write-Host "Expected Costs:" -ForegroundColor Cyan
    Write-Host "  User1: ₦6000"
    Write-Host "  User2: ₦4000"
    Write-Host ""
    Write-Host "Actual Costs:" -ForegroundColor Cyan
    Write-Host "  User1: ₦$user1Cost"
    Write-Host "  User2: ₦$user2Cost"
    Write-Host ""

    if ($user1Cost -eq 6000 -and $user2Cost -eq 4000) {
        Write-Host "✅ Cost calculation is WORKING CORRECTLY!" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Cost calculation NOT working correctly" -ForegroundColor Red
        Write-Host "   Should be ₦6000 and ₦4000, got ₦$user1Cost and ₦$user2Cost" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Failed to call calculation endpoint" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure Python engine is running!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================"
Write-Host "✅ DEBUG TEST COMPLETE" -ForegroundColor Cyan
Write-Host "======================================"
