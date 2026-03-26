// src/routes/groupRoutes.js
import express from 'express';
import { createGroup, getMyGroups, inviteMember, getGroupDetails, deleteGroup, leaveGroup } from '../controllers/groupController.js';
import { requireAuth } from '../middlewares/authMid.js';

const router = express.Router();

router.post('/create', requireAuth, createGroup);
router.post('/invite', requireAuth, inviteMember);
router.get('/my-groups', requireAuth, getMyGroups);
router.get('/:id', requireAuth, getGroupDetails);
router.delete('/:id', requireAuth, deleteGroup);
router.delete('/:id/leave', requireAuth, leaveGroup);

export default router;