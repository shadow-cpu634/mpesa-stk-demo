/**
 * PAYMENT REQUEST VALIDATOR
 * 
 * WHY IT EXISTS:
 * Validating client input before it reaches services prevents execution errors,
 * avoids wasting resources on invalid external API calls (which might get rejected by Safaricom),
 * and ensures our API clients receive clean, formatted data.
 * 
 * WHAT IT DOES:
 * - Uses express-validator to define validation rules for request bodies.
 * - Validates STK Push inputs (amount, phone number, reference, description).
 * - Validates STK Status Query inputs (checkoutRequestId).
 * 
 * WHEN IT SHOULD BE USED:
 * Import and place these validation arrays as middleware inside the payment router file
 * (e.g. payment.routes.js) before the corresponding controller actions are hit.
 */

import { body, validationResult } from 'express-validator';

/**
 * Middleware that checks for express-validator results.
 * If errors are found, formats them and intercepts the request by returning a 400 response.
 */
export const validateFields = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format errors to match our global standardized error response:
    // { success: false, message: '...', errors: [...] }
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));

    return res.status(400).json({
      success: false,
      message: 'Request validation failed.',
      errors: formattedErrors
    });
  }
  next();
};

/**
 * Validation rules for initiating an STK Push payment.
 */
export const validateSTKPush = [
  body('amount')
    .notEmpty().withMessage('Amount is required.')
    .isNumeric().withMessage('Amount must be a number.')
    .custom(val => parseFloat(val) > 0).withMessage('Amount must be greater than 0.'),

  body('phoneNumber')
    .notEmpty().withMessage('PhoneNumber is required.')
    .trim()
    .custom((val) => {
      // Regex matches Kenyan format: 07..., 01..., 2547..., 2541..., +2547..., +2541...
      const kenyanPhoneRegex = /^(?:254|\+254|0)?(7|1)(?:[0-9]{8})$/;
      if (!kenyanPhoneRegex.test(val)) {
        throw new Error('Invalid Kenyan phone number format. Examples: 0712345678 or 254712345678.');
      }
      return true;
    }),

  body('reference')
    .optional()
    .trim()
    .isLength({ min: 1, max: 12 }).withMessage('Account Reference must be between 1 and 12 characters (Daraja limit).')
    .matches(/^[a-zA-Z0-9_\-\s]+$/).withMessage('Account Reference can only contain alphanumeric characters, spaces, dashes, or underscores.'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 18 }).withMessage('Transaction Description must be between 1 and 18 characters (Daraja limit).'),
    
  validateFields
];

/**
 * Validation rules for querying STK Push transaction status.
 */
export const validateSTKQuery = [
  body('checkoutRequestId')
    .notEmpty().withMessage('CheckoutRequestId is required.')
    .trim()
    .isString().withMessage('CheckoutRequestId must be a valid string.'),
    
  validateFields
];
