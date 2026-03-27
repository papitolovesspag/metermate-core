// src/routes/paymentRoutes.js
import express from 'express';
import {
  initializePayment,
  verifyPayment,
  purchaseElectricity,
  getPaymentStatusForUser
} from '../controllers/paymentController.js';
import { getTransactionHistory } from '../controllers/transactionController.js';
import { requireAuth } from '../middlewares/authMid.js';

const router = express.Router();

// --- INWARD FUNDING (Webpay) ---
router.post('/initialize', requireAuth, initializePayment);
router.post('/verify', requireAuth, verifyPayment);
router.get('/status/:group_id', requireAuth, getPaymentStatusForUser);

// --- OUTWARD SPENDING (VAS API) ---
router.post('/purchase-electricity', requireAuth, purchaseElectricity);

// --- HISTORY ---
router.get('/history/:group_id', requireAuth, getTransactionHistory);

export default router;
