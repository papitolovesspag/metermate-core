// src/routes/paymentRoutes.js
import express from 'express';
import { initializePayment, verifyPayment } from '../controllers/paymentController.js';
import { getTransactionHistory } from '../controllers/transactionController.js';
import { requireAuth } from '../middlewares/authMid.js';

const router = express.Router();

// Initialize a payment session
router.post('/initialize', requireAuth, initializePayment);

// Verify payment after Interswitch completes
router.post('/verify', requireAuth, verifyPayment);

// Get transaction history for a group
router.get('/history/:group_id', requireAuth, getTransactionHistory);

export default router;
