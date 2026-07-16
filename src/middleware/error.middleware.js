/**
 * GLOBAL ERROR HANDLING MIDDLEWARE
 * 
 * WHY IT EXISTS:
 * Instead of wrapping every single controller function block with try-catch that manually 
 * returns JSON errors, Node/Express allows propagating errors downstream using next(error).
 * This middleware acts as a catch-all safety net that intercepts all thrown errors, 
 * formats them, and returns a unified JSON payload to the client.
 * 
 * WHAT IT DOES:
 * - Detects the nature of the error (e.g. Validation Error, Daraja API Error, or internal Server Error).
 * - Sets the correct HTTP status code.
 * - Formats the error into our standardized JSON output structure:
 *   { success: false, message: "...", errors: [...] }
 * - Logs details to the console for server-side debugging.
 * 
 * WHEN IT SHOULD BE USED:
 * Registered as the LAST middleware in app.js. Express requires error middleware to have 
 * exactly four arguments: (err, req, res, next).
 */

import config from '../config/index.js';

export const errorHandler = (err, req, res, next) => {
  // Determine HTTP status code: default to 500 (Internal Server Error)
  const statusCode = err.statusCode || 500;
  
  // Format the base error message
  const responsePayload = {
    success: false,
    message: err.message || 'An unexpected server error occurred.',
    errors: []
  };

  // Log error stack for developer troubleshooting
  console.error(`[GlobalErrorHandler] Error: ${err.message}`);
  if (err.stack && config.env === 'development') {
    console.error(err.stack);
  }

  // Handle express-validator style arrays if present, or add raw API details
  if (err.errors && Array.isArray(err.errors)) {
    responsePayload.errors = err.errors;
  } else if (err.raw) {
    // If it's a raw Daraja API error (parsed inside safaricom.client.js)
    responsePayload.errors = [
      {
        code: err.raw.errorCode || 'DARAJA_ERROR',
        details: err.raw.errorMessage || 'Safaricom Daraja API rejected the request.'
      }
    ];
  } else {
    // Standard singular errors
    responsePayload.errors = [
      {
        message: err.message || 'Internal server error.'
      }
    ];
  }

  // Include stack trace in response only in development environment for students
  if (config.env === 'development') {
    responsePayload.stack = err.stack;
  }

  return res.status(statusCode).json(responsePayload);
};

export default errorHandler;
