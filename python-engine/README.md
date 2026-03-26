# MeterMate Calculation Engine

A dedicated Python FastAPI microservice that handles all cost calculation logic for the MeterMate meter-sharing application.

## Features

- **Consumption Calculations**: Calculates kWh consumption per user based on appliance data
- **Cost Allocation**: Allocates costs to users proportional to their consumption (exact to the Naira)
- **Settlement Tracking**: Determines who owes what, payment status, and outstanding balances

## Installation

1. Install Python 3.9+

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Service

Start the calculation engine on port 8001:

```bash
python main.py
```

Or with Uvicorn directly:

```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## API Endpoints

### 1. Health Check
```
GET /
```
Returns service status

### 2. Calculate Consumption
```
POST /calculate/consumption
```
Calculate total kWh consumption per user

**Request:**
```json
{
  "appliances": [
    {
      "user_id": "user-123",
      "device_name": "AC",
      "wattage": 3500,
      "daily_hours": 8
    }
  ]
}
```

**Response:**
```json
{
  "consumption_per_user": {
    "user-123": 28.0
  },
  "total_consumption_kwh": 28.0,
  "percentage_per_user": {
    "user-123": 100.0
  }
}
```

### 3. Calculate Cost Allocation
```
POST /calculate/cost-allocation
```
Calculate exact cost per user based on consumption

**Request:**
```json
{
  "appliances": [...],
  "total_cost": 50000,
  "member_ids": ["user-123", "user-456"]
}
```

**Response:**
```json
{
  "consumption_per_user": {...},
  "cost_per_user": {
    "user-123": 35000.00,
    "user-456": 15000.00
  },
  "percentage_per_user": {...},
  "total_consumption_kwh": 28.0,
  "total_cost": 50000
}
```

### 4. Calculate Settlement
```
POST /calculate/settlement
```
Calculate settlement status and outstanding balances

**Request:**
```json
{
  "total_cost": 50000,
  "consumption_per_user": {
    "user-123": 28.0,
    "user-456": 12.0
  },
  "payments_made": {
    "user-123": 20000,
    "user-456": 15000
  }
}
```

**Response:**
```json
{
  "cost_per_user": {...},
  "payments_made": {...},
  "outstanding_per_user": {
    "user-123": 15000.00,
    "user-456": 0.00
  },
  "settlement_status": {
    "user-123": "pending",
    "user-456": "settled"
  }
}
```

## Algorithm Details

### Consumption Calculation
```
Daily kWh = (wattage / 1000) × daily_hours
User Total = Sum of all their appliances' kWh
```

### Cost Allocation (Exact to Naira)
```
Cost per User = (User Consumption / Total Consumption) × Total Cost
Last User Gets: Total Cost - Sum of all others (ensures exact total)
Result: All amounts rounded to 2 decimals (Naira precision)
```

### Settlement Status
- **settled**: User has paid exactly what they owe
- **pending**: User still owes money
- **overpaid**: User has paid more than they owe

## Error Handling

All endpoints return proper HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid input)
- `500`: Internal server error

## Environment Variables

- `PORT`: Service port (default: 8001)
- `LOG_LEVEL`: Logging level (default: INFO)

## Documentation

Once the service is running, visit:
- Interactive docs: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

## Integration with Node.js Backend

The Node.js backend calls this service via HTTP:

```javascript
const response = await axios.post('http://localhost:8001/calculate/cost-allocation', {
  appliances, total_cost, member_ids
});
```

Error handling includes fallback to equal-split if the service is unavailable.
