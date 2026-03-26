// src/services/calculationService.js
import axios from 'axios';

const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || 'http://localhost:8001';

export const callCalculationEngine = async (appliances, totalCost, memberIds) => {
  try {
    const response = await axios.post(`${PYTHON_ENGINE_URL}/calculate/cost-allocation`, {
      appliances,
      total_cost: totalCost,
      member_ids: memberIds
    }, { timeout: 10000 });

    return response.data;
  } catch (error) {
    console.error('Python engine error:', error.message);

    // Fallback: Equal split if engine is unavailable
    console.warn('⚠️ Calculation engine unavailable, using equal split fallback');
    return getEqualSplitFallback(memberIds, totalCost);
  }
};

const getEqualSplitFallback = (memberIds, totalCost) => {
  const costPerUser = {};
  const splitAmount = parseFloat((totalCost / memberIds.length).toFixed(2));

  memberIds.forEach((userId, index) => {
    if (index === memberIds.length - 1) {
      // Last user gets the remainder
      costPerUser[userId] = parseFloat((totalCost - (splitAmount * (memberIds.length - 1))).toFixed(2));
    } else {
      costPerUser[userId] = splitAmount;
    }
  });

  return {
    consumption_per_user: {},
    cost_per_user: costPerUser,
    percentage_per_user: memberIds.reduce((acc, userId) => {
      acc[userId] = parseFloat((100 / memberIds.length).toFixed(2));
      return acc;
    }, {}),
    total_consumption_kwh: 0,
    total_cost: totalCost
  };
};
