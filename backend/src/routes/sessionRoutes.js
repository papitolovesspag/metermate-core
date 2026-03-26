// src/routes/sessionRoutes.js
import express from 'express';
import { createBillingSession, getBillingHistory, settleSession, calculateGroupCosts } from '../controllers/sessionController.js';
import { requireAuth } from '../middlewares/authMid.js';

const router = express.Router();

router.post('/create', requireAuth, createBillingSession);
router.get('/history/:group_id', requireAuth, getBillingHistory);
router.post('/settle', requireAuth, settleSession);
router.post('/calculate-costs', requireAuth, calculateGroupCosts);

export default router;
