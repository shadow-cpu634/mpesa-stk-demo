/**
 * PAYMENT CONTROLLER
 * 
 * WHY IT EXISTS:
 * This controller handles HTTP request routing entry points for M-Pesa transaction flows.
 * It manages the HTTP response statuses, parses incoming bodies, delegates processing to the 
 * PaymentService, and handles asynchronous transaction callbacks from Safaricom.
 * 
 * WHAT IT DOES:
 * - Handles the /api/payments/stkpush (POST) to initiate STK Pushes.
 * - Handles the /api/payments/query (POST) to query transaction statuses.
 * - Handles the /api/payments/callback (POST) endpoint that Safaricom calls.
 * - Handles the /api/payments/callback (GET) to inspect received callbacks in memory.
 * - Standardizes success responses.
 * 
 * WHEN IT SHOULD BE USED:
 * Bound to the payment router. Controllers should never implement core M-Pesa client 
 * details or DB actions directly.
 */

import paymentService from '../services/payment.service.js';

/**
 * Initiates an STK Push (Lipa Na M-Pesa Online) payment.
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const initiatePayment = async (req, res, next) => {
  try {
    const { amount, phoneNumber, reference, description } = req.body;
    
    console.log(`[PaymentController] Initiating payment request for amount: ${amount}, phone: ${phoneNumber}`);

    // Call the payment service to run the transaction workflow
    const result = await paymentService.initiateSTKPush({
      amount,
      phoneNumber,
      reference,
      description
    });

    return res.status(200).json({
      success: true,
      message: 'STK Push payment prompt initiated successfully. Check your handset for the M-Pesa PIN prompt.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Queries the status of an initiated STK Push transaction.
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const queryPaymentStatus = async (req, res, next) => {
  try {
    const { checkoutRequestId } = req.body;

    console.log(`[PaymentController] Querying payment status for CheckoutRequestID: ${checkoutRequestId}`);

    // Call the service to request status updates from Safaricom
    const result = await paymentService.queryTransactionStatus(checkoutRequestId);

    return res.status(200).json({
      success: true,
      message: 'STK Push transaction query completed.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Receives the asynchronous callback data from Safaricom when the customer completes
 * or rejects the STK Push prompt.
 * 
 * IMPORTANT FOR STUDENTS:
 * Safaricom expects us to respond back with a standard JSON message acknowledging receipt 
 * of the callback. If we fail to respond with a 200 HTTP code, Safaricom will mark the callback
 * as undelivered and retry sending it multiple times.
 * 
 * @param {object} req - Express request object (contains Safaricom raw callback body)
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const handleMpesaCallback = async (req, res, next) => {
  try {
    console.log('[PaymentController] Callback received from Safaricom.');
    
    // Process the callback data through the payment service
    const processedTransaction = paymentService.processCallback(req.body);

    // Respond to Safaricom immediately to acknowledge callback delivery.
    // Safaricom is strict and expects this return format: { ResponseCode: "0", ResponseDesc: "success" }
    return res.status(200).json({
      ResponseCode: '0',
      ResponseDesc: 'Callback received and processed successfully'
    });
  } catch (error) {
    console.error('[PaymentController] Error processing callback:', error.message);
    
    // Acknowledge Safaricom callback even if processing fails internally 
    // to prevent continuous retry loop, or let it fail depending on server preference.
    // For educational sandbox, we return an acknowledgment code.
    return res.status(400).json({
      ResponseCode: '1',
      ResponseDesc: error.message || 'Callback parsing failed'
    });
  }
};

/**
 * Exposes a helper GET endpoint to retrieve the list of received callbacks in memory.
 * 
 * WHY IT EXISTS:
 * Since this educational demo doesn't write to a database, this endpoint enables students 
 * to easily see and inspect callbacks received by the server via Postman or browser queries.
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const listCallbacks = (req, res) => {
  const callbacks = paymentService.getCallbacks();
  return res.status(200).json({
    success: true,
    message: 'Recent received M-Pesa callbacks retrieved successfully.',
    data: {
      count: callbacks.length,
      callbacks: callbacks
    }
  });
};
