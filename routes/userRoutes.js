import express from 'express';
import { getUserStatus, resetMonthlyQuotas } from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get user status (requires authentication)
router.get('/user/status', authenticate, getUserStatus);

// Admin endpoint to reset quotas (requires authentication)
router.post('/admin/reset-quotas', authenticate, resetMonthlyQuotas);

export default router;
