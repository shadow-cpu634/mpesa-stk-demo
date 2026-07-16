/**
 * AUTHENTICATION CONTROLLER
 * 
 * WHY IT EXISTS:
 * This controller serves as the entry point for authentication-related HTTP requests.
 * It separates HTTP request parsing, status code management, and JSON response delivery 
 * from the underlying token service.
 * 
 * WHAT IT DOES:
 * - Listens for manually triggered token requests.
 * - Invokes the AuthService to acquire a valid M-Pesa OAuth access token.
 * - Handles errors and delivers standard JSON responses.
 * 
 * WHEN IT SHOULD BE USED:
 * Bound to the auth routes (/api/auth/token) to let students test generating OAuth tokens 
 * from Daraja and inspect the cached token lifetimes.
 */

import authService from '../services/auth.service.js';

/**
 * Handles the manual retrieval and viewing of the M-Pesa OAuth Access Token.
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const getOAuthToken = async (req, res, next) => {
  try {
    console.log('[AuthController] Manual token generation triggered.');
    
    // Delegate the acquisition logic to the AuthService
    const token = await authService.getAccessToken();

    // Return the token in our standard success structure
    return res.status(200).json({
      success: true,
      message: 'M-Pesa OAuth Access Token generated successfully.',
      data: {
        accessToken: token,
        // Provide hint to students that this token is usually valid for 3599 seconds
        tokenType: 'Bearer',
        expiresIn: 'Check console logs for absolute cache expiry timestamp'
      }
    });
  } catch (error) {
    // If anything fails in the client or service layer, bubble it to the global error middleware
    next(error);
  }
};
