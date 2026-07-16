/**
 * AUTHENTICATION SERVICE
 * 
 * WHY IT EXISTS:
 * This service handles the business logic surrounding authentication with Safaricom.
 * Specifically, it handles OAuth 2.0 Access Token management, including caching token
 * lifetimes in memory to improve API speed and prevent rate-limiting from Daraja.
 * 
 * WHAT IT DOES:
 * - Directs token retrieval from the Safaricom Client.
 * - Caches the token in-memory along with its expiry timestamp.
 * - Automatically checks cache validity and refreshes the token if expired or near expiry.
 * 
 * WHEN IT SHOULD BE USED:
 * This service should be called by other internal services (e.g. PaymentService) or by
 * the AuthController to retrieve a valid authorization token for Daraja.
 */

import safaricomClient from '../clients/safaricom.client.js';

class AuthService {
  constructor() {
    // In-memory token cache details
    this.cachedToken = null;
    this.tokenExpiryTime = null;
  }

  /**
   * Retrieves a valid OAuth access token, either from memory cache or fresh from Safaricom.
   * 
   * THE FLOW EXPLAINED TO STUDENTS:
   * 1. Check if we already have a cached token and whether it is still valid.
   * 2. We use a buffer of 60 seconds (1 minute) before the absolute expiry time to prevent race conditions 
   *    where the token expires exactly during our network transit to Safaricom.
   * 3. If valid, return the cached token immediately (skips an expensive HTTP request).
   * 4. If invalid or missing, invoke the safaricomClient to generate a new token.
   * 5. Set the new cached token and compute the absolute expiration timestamp (Date.now() + (expiresIn * 1000)).
   * 6. Return the new token.
   * 
   * @returns {Promise<string>} The active M-Pesa Access Token
   */
  async getAccessToken() {
    const bufferMs = 60000; // 60 seconds buffer
    const now = Date.now();

    // Check if cache is still fresh and valid
    if (this.cachedToken && this.tokenExpiryTime && (now + bufferMs < this.tokenExpiryTime)) {
      console.log('[AuthService] Returning cached OAuth access token.');
      return this.cachedToken;
    }

    console.log('[AuthService] Cached token missing or expired. Fetching a fresh token from Daraja...');
    
    // Fetch a new token from the Safaricom HTTP client
    const { accessToken, expiresIn } = await safaricomClient.generateAccessToken();

    // Cache the new token. Note: expiresIn is returned in seconds (usually 3599s)
    this.cachedToken = accessToken;
    this.tokenExpiryTime = now + (parseInt(expiresIn, 10) * 1000);

    console.log(`[AuthService] Fresh OAuth token cached. Valid until: ${new Date(this.tokenExpiryTime).toISOString()}`);
    return this.cachedToken;
  }

  /**
   * Resets the in-memory OAuth token cache.
   * Useful for manual refresh or clearing during server resets/testing.
   */
  clearTokenCache() {
    this.cachedToken = null;
    this.tokenExpiryTime = null;
    console.log('[AuthService] OAuth Token cache cleared.');
  }
}

export default new AuthService();
