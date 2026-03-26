// src/routes/applianceRoutes.js
import express from 'express';
import { addAppliance, getGroupAppliances, deleteAppliance } from '../controllers/applianceController.js';
import { requireAuth } from '../middlewares/authMid.js';

const router = express.Router();

// POST /api/appliances/add
router.post('/add', requireAuth, addAppliance);

// GET /api/appliances/:group_id
router.get('/:group_id', requireAuth, getGroupAppliances);

// DELETE /api/appliances/:id
router.delete('/:id', requireAuth, deleteAppliance);

export default router;