/**
 * PAYMENT ROUTER
 * 
 * WHY IT EXISTS:
 * This router exposes payments endpoints for initiating STK Pushes, querying statuses,
 * and receiving payment response callbacks.
 * 
 * WHAT IT DOES:
 * - Creates an Express Router instance.
 * - Imports validators and binds them to relevant endpoints.
 * - Binds paths to their respective PaymentController actions.
 * 
 * WHEN IT SHOULD BE USED:
 * Mounted in app.js under the /api/payments prefix.
 */

import { Router } from 'express';
import { 
  initiatePayment, 
  queryPaymentStatus, 
  handleMpesaCallback,
  listCallbacks
} from '../controllers/payment.controller.js';
import { 
  validateSTKPush, 
  validateSTKQuery 
} from '../validators/payment.validator.js';

const router = Router();

// POST /api/payments/stkpush - Triggers Lipa Na M-Pesa STK Push prompt to client's phone
router.post('/stkpush', validateSTKPush, initiatePayment);

// POST /api/payments/query - Queries status of a transaction with CheckoutRequestID
router.post('/query', validateSTKQuery, queryPaymentStatus);

// POST /api/payments/callback - Safaricom Daraja calls this endpoint asynchronously with results
router.post('/callback', handleMpesaCallback);

// GET /api/payments/callback - Helper endpoint for students to view recently received callbacks
router.get('/callback', listCallbacks);

export default router;
