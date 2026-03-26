"""
MeterMate Calculation Engine - FastAPI Microservice
Handles cost allocation logic and consumption calculations
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
from decimal import Decimal, ROUND_HALF_UP
import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="MeterMate Calculation Engine", version="1.0.0")

# Enable CORS for all origins (adjust in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====================== Pydantic Models ======================

class Appliance(BaseModel):
    """Represents a user's appliance"""
    user_id: str
    device_name: str
    wattage: int
    daily_hours: int

class ConsumptionRequest(BaseModel):
    """Request for consumption calculation"""
    appliances: List[Appliance]

class ConsumptionResponse(BaseModel):
    """Consumption calculation response"""
    consumption_per_user: Dict[str, float]  # user_id -> kWh
    total_consumption_kwh: float
    percentage_per_user: Dict[str, float]  # user_id -> percentage

class CostAllocationRequest(BaseModel):
    """Request for cost allocation"""
    appliances: List[Appliance]
    total_cost: float
    member_ids: List[str]

class CostAllocationResponse(BaseModel):
    """Cost allocation response"""
    consumption_per_user: Dict[str, float]  # user_id -> kWh
    cost_per_user: Dict[str, float]  # user_id -> exact naira amount
    percentage_per_user: Dict[str, float]  # user_id -> percentage
    total_consumption_kwh: float
    total_cost: float

class SettlementRequest(BaseModel):
    """Request for settlement calculation"""
    total_cost: float
    consumption_per_user: Dict[str, float]  # user_id -> kWh
    payments_made: Dict[str, float]  # user_id -> amount paid

class SettlementResponse(BaseModel):
    """Settlement calculation response"""
    cost_per_user: Dict[str, float]  # user_id -> allocated cost
    payments_made: Dict[str, float]  # user_id -> paid amount
    outstanding_per_user: Dict[str, float]  # user_id -> amount owed
    settlement_status: Dict[str, str]  # user_id -> 'settled', 'pending', 'overpaid'

# ====================== Helper Functions ======================

def calculate_daily_kwh(wattage: int, daily_hours: int) -> float:
    """Calculate daily kWh consumption for an appliance"""
    return (wattage / 1000) * daily_hours

def round_to_naira(value: float) -> float:
    """Round to 2 decimal places (Naira precision)"""
    return float(Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

def calculate_consumption_per_user(appliances: List[Appliance]) -> Dict[str, float]:
    """Calculate total consumption (in kWh) per user"""
    consumption = {}

    for appliance in appliances:
        daily_kwh = calculate_daily_kwh(appliance.wattage, appliance.daily_hours)
        if appliance.user_id not in consumption:
            consumption[appliance.user_id] = 0
        consumption[appliance.user_id] += daily_kwh

    # Ensure all users are in the dict (even if 0 consumption)
    return {user_id: round(kwh, 4) for user_id, kwh in consumption.items()}

# ====================== Endpoints ======================

@app.get("/", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "MeterMate Calculation Engine",
        "version": "1.0.0"
    }

@app.post("/calculate/consumption", response_model=ConsumptionResponse, tags=["Calculations"])
async def calculate_consumption(request: ConsumptionRequest):
    """
    Calculate total consumption (in kWh) per user

    Formula: Daily kWh = (wattage / 1000) * daily_hours
    """
    try:
        if not request.appliances:
            raise HTTPException(status_code=400, detail="No appliances provided")

        # Calculate consumption per user
        consumption_per_user = calculate_consumption_per_user(request.appliances)

        # Calculate total consumption
        total_consumption_kwh = sum(consumption_per_user.values())

        if total_consumption_kwh == 0:
            raise HTTPException(status_code=400, detail="Total consumption is zero")

        # Calculate percentage per user
        percentage_per_user = {
            user_id: round((kwh / total_consumption_kwh) * 100, 2)
            for user_id, kwh in consumption_per_user.items()
        }

        logger.info(f"Calculated consumption for {len(consumption_per_user)} users. Total: {total_consumption_kwh} kWh")

        return ConsumptionResponse(
            consumption_per_user=consumption_per_user,
            total_consumption_kwh=round(total_consumption_kwh, 4),
            percentage_per_user=percentage_per_user
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in calculate_consumption: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")

@app.post("/calculate/cost-allocation", response_model=CostAllocationResponse, tags=["Calculations"])
async def calculate_cost_allocation(request: CostAllocationRequest):
    """
    Calculate exact cost allocation per user (to the Naira)

    Formula: User cost = (user_consumption / total_consumption) * total_cost
    Special handling: Final user gets remainder to ensure total = total_cost exactly
    """
    try:
        if not request.appliances:
            raise HTTPException(status_code=400, detail="No appliances provided")

        if request.total_cost <= 0:
            raise HTTPException(status_code=400, detail="Total cost must be positive")

        # Calculate consumption per user
        consumption_per_user = calculate_consumption_per_user(request.appliances)
        total_consumption_kwh = sum(consumption_per_user.values())

        if total_consumption_kwh == 0:
            # Equal split if no consumption data
            cost_per_user = {
                user_id: round_to_naira(request.total_cost / len(request.member_ids))
                for user_id in request.member_ids
            }
        else:
            cost_per_user = {}
            sorted_users = sorted(consumption_per_user.keys())
            accumulated_cost = 0

            # Calculate cost for each user
            for i, user_id in enumerate(sorted_users):
                kwh = consumption_per_user[user_id]

                if i == len(sorted_users) - 1:
                    # Last user gets remainder to ensure exact total
                    user_cost = round_to_naira(request.total_cost - accumulated_cost)
                else:
                    # Calculate proportional cost
                    user_cost = round_to_naira(
                        (kwh / total_consumption_kwh) * request.total_cost
                    )
                    accumulated_cost += user_cost

                cost_per_user[user_id] = user_cost

            # Add users with 0 consumption to the dict
            for user_id in request.member_ids:
                if user_id not in cost_per_user:
                    cost_per_user[user_id] = 0

        # Calculate percentage per user
        percentage_per_user = {
            user_id: round((cost / request.total_cost * 100) if request.total_cost > 0 else 0, 2)
            for user_id, cost in cost_per_user.items()
        }

        # Verify total equals requested total (within rounding error)
        actual_total = sum(cost_per_user.values())
        if abs(actual_total - request.total_cost) > 0.01:
            logger.warning(f"Cost allocation mismatch: expected {request.total_cost}, got {actual_total}")

        logger.info(f"Cost allocation for {len(cost_per_user)} users. Total: ₦{request.total_cost}")

        return CostAllocationResponse(
            consumption_per_user=consumption_per_user,
            cost_per_user=cost_per_user,
            percentage_per_user=percentage_per_user,
            total_consumption_kwh=round(total_consumption_kwh, 4),
            total_cost=request.total_cost
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in calculate_cost_allocation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")

@app.post("/calculate/settlement", response_model=SettlementResponse, tags=["Calculations"])
async def calculate_settlement(request: SettlementRequest):
    """
    Calculate settlement status for each user

    Returns: Amount owed, paid, outstanding, and status (settled/pending/overpaid)
    """
    try:
        if request.total_cost <= 0:
            raise HTTPException(status_code=400, detail="Total cost must be positive")

        # Calculate consumption per user
        consumption_per_user = request.consumption_per_user
        total_consumption_kwh = sum(consumption_per_user.values())

        # Calculate cost allocation
        if total_consumption_kwh == 0:
            # Equal split
            num_users = len(consumption_per_user)
            cost_per_user = {
                user_id: round_to_naira(request.total_cost / num_users)
                for user_id in consumption_per_user.keys()
            }
        else:
            cost_per_user = {}
            sorted_users = sorted(consumption_per_user.keys())
            accumulated_cost = 0

            for i, user_id in enumerate(sorted_users):
                kwh = consumption_per_user[user_id]

                if i == len(sorted_users) - 1:
                    user_cost = round_to_naira(request.total_cost - accumulated_cost)
                else:
                    user_cost = round_to_naira(
                        (kwh / total_consumption_kwh) * request.total_cost
                    )
                    accumulated_cost += user_cost

                cost_per_user[user_id] = user_cost

        # Calculate outstanding per user
        outstanding_per_user = {}
        settlement_status = {}

        for user_id in consumption_per_user.keys():
            allocated_cost = cost_per_user.get(user_id, 0)
            paid = request.payments_made.get(user_id, 0)
            outstanding = round_to_naira(allocated_cost - paid)

            outstanding_per_user[user_id] = max(0, outstanding)

            # Determine status
            if outstanding < 0:  # Overpaid
                settlement_status[user_id] = "overpaid"
            elif outstanding == 0:  # Exact payment
                settlement_status[user_id] = "settled"
            else:  # Still owes
                settlement_status[user_id] = "pending"

        logger.info(f"Settlement calculated for {len(settlement_status)} users")

        return SettlementResponse(
            cost_per_user=cost_per_user,
            payments_made=request.payments_made,
            outstanding_per_user=outstanding_per_user,
            settlement_status=settlement_status
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in calculate_settlement: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")

# ====================== Root Endpoint ======================

@app.get("/docs", tags=["Documentation"])
async def documentation():
    """API Documentation endpoint"""
    return {
        "title": "MeterMate Calculation Engine API",
        "version": "1.0.0",
        "endpoints": {
            "POST /calculate/consumption": "Calculate kWh consumption per user",
            "POST /calculate/cost-allocation": "Calculate exact cost allocation per user",
            "POST /calculate/settlement": "Calculate settlement status per user"
        }
    }

# ====================== Run Application ======================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
