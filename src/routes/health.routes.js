/**
 * HEALTH ROUTER
 * 
 * WHY IT EXISTS:
 * This file defines the entry endpoint for monitoring application status.
 * It separates route paths from controller executions.
 * 
 * WHAT IT DOES:
 * - Creates an Express Router instance.
 * - Binds the GET / path to the checkHealth controller.
 * 
 * WHEN IT SHOULD BE USED:
 * Loaded inside app.js under the /api/health prefix.
 */

import { Router } from 'express';
import { checkHealth } from '../controllers/health.controller.js';

const router = Router();

// GET /api/health - Verifies system functionality
router.get('/', checkHealth);

export default router;
