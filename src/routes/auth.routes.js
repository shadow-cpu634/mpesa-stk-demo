/**
 * AUTHENTICATION ROUTER
 * 
 * WHY IT EXISTS:
 * This router exposes security and token generation endpoints.
 * 
 * WHAT IT DOES:
 * - Creates an Express Router instance.
 * - Binds the GET /token path to the getOAuthToken controller.
 * 
 * WHEN IT SHOULD BE USED:
 * Mounted in app.js under the /api/auth prefix.
 */

import { Router } from 'express';
import { getOAuthToken } from '../controllers/auth.controller.js';

const router = Router();

// GET /api/auth/token - Generates and returns a fresh or cached M-Pesa access token
router.get('/token', getOAuthToken);

export default router;
