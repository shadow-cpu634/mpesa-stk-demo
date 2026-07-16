/**
 * SAFARICOM DARAJA API CLIENT
 * 
 * WHY IT EXISTS:
 * This client serves as the dedicated network wrapper for communicating directly with
 * Safaricom's Daraja APIs. It isolates the HTTP request-response cycle, header generation,
 * and external API calls from the rest of the application.
 * 
 * WHAT IT DOES:
 * - Generates OAuth access tokens from Safaricom.
 * - Computes Lipa Na M-Pesa password hashes.
 * - Triggers STK Push (Lipa Na M-Pesa Online) transactions.
 * - Queries status of an STK Push transaction.
 * - Standardizes errors thrown by Daraja.
 * 
 * WHEN IT SHOULD BE USED:
 * This client is invoked exclusively by Services (e.g., PaymentService, AuthService) 
 * to handle any direct API communication with Safaricom. Controllers should never call this directly.
 */

import axios from 'axios';
import config from '../config/index.js';

export class SafaricomClient {
  constructor() {
    this.baseUrl = config.mpesa.baseUrl;
    this.consumerKey = config.mpesa.consumerKey;
    this.consumerSecret = config.mpesa.consumerSecret;
  }

  /**
   * Generates an OAuth 2.0 Access Token from Safaricom.
   * 
   * HOW IT WORKS:
   * 1. Encodes the Consumer Key and Consumer Secret in Base64 (Basic Auth format).
   * 2. Sends a GET request to the /oauth/v1/generate endpoint.
   * 3. Receives an access token valid for 3599 seconds (1 hour).
   * 
   * @returns {Promise<object>} Object containing access_token and expires_in
   */
  async generateAccessToken() {
    try {
      // Basic Auth Credentials format: Base64(ConsumerKey:ConsumerSecret)
      const credentials = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            Accept: 'application/json'
          }
        }
      );

      // Log success for educational tracking
      console.log('[SafaricomClient] OAuth Token generated successfully.');
      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      console.error('[SafaricomClient] Error generating OAuth access token:', error.response?.data || error.message);
      this._handleApiError(error, 'OAuth Access Token Generation');
    }
  }

  /**
   * Generates a password string for Lipa Na M-Pesa transaction requests.
   * 
   * HOW IT WORKS:
   * The password is a Base64-encoded string of: BusinessShortCode + PassKey + Timestamp.
   * - BusinessShortCode: Unique identifier for the merchant account.
   * - Passkey: The secret key provided by Daraja for authentication.
   * - Timestamp: Format YYYYMMDDHHmmss.
   * 
   * @param {string} shortcode - Merchant Business Short Code (e.g. 174379)
   * @param {string} passkey - Merchant Passkey
   * @param {string} timestamp - Timestamp formatted as YYYYMMDDHHmmss
   * @returns {string} Base64-encoded password hash
   */
  generatePassword(shortcode, passkey, timestamp) {
    const rawString = `${shortcode}${passkey}${timestamp}`;
    return Buffer.from(rawString).toString('base64');
  }

  /**
   * Triggers an STK Push (Lipa Na M-Pesa Online) via Daraja API.
   * 
   * HOW IT WORKS:
   * 1. Takes payment details and initiates a customer-facing payment prompt (STK Push).
   * 2. The customer enters their M-Pesa PIN on their phone.
   * 3. Results are asynchronously returned to the CallBackURL.
   * 
   * @param {object} params - STK Push parameters
   * @param {string} params.accessToken - Safaricom OAuth access token
   * @param {string} params.amount - Amount to charge (integer/float string)
   * @param {string} params.phoneNumber - Phone number initiating payment (2547XXXXXXXX)
   * @param {string} params.reference - Short account reference (max 12 chars)
   * @param {string} params.description - Transaction description (max 18 chars)
   * @returns {Promise<object>} Safaricom Daraja STK response payload
   */
  async stkPush({ accessToken, amount, phoneNumber, reference, description }) {
    const timestamp = this._getTimestamp();
    const shortcode = config.mpesa.businessShortCode;
    const passkey = config.mpesa.passkey;
    const password = this.generatePassword(shortcode, passkey, timestamp);

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline', // Sandbox default Lipa Na M-Pesa
      Amount: String(amount),
      PartyA: phoneNumber, // The phone number of the customer initiating the transaction
      PartyB: shortcode, // For Paybill, PartyB is the BusinessShortCode
      PhoneNumber: phoneNumber, // The phone number receiving the STK prompt
      CallBackURL: config.mpesa.callbackUrl,
      AccountReference: reference,
      TransactionDesc: description
    };

    try {
      console.log('[SafaricomClient] Sending STK Push Payload to Daraja:', JSON.stringify(payload, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[SafaricomClient] STK Push Response received:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('[SafaricomClient] STK Push Error response:', error.response?.data || error.message);
      this._handleApiError(error, 'STK Push Initiation');
    }
  }

  /**
   * Queries Safaricom to get the status of an STK Push payment transaction.
   * 
   * HOW IT WORKS:
   * If a callback isn't received or the merchant needs to confirm transaction status programmatically,
   * this endpoint queries the status using the original CheckoutRequestID.
   * 
   * @param {object} params - STK Query parameters
   * @param {string} params.accessToken - Safaricom OAuth access token
   * @param {string} params.checkoutRequestId - Unique checkout ID returned during STK initiation
   * @returns {Promise<object>} Safaricom Daraja Query response payload
   */
  async querySTK({ accessToken, checkoutRequestId }) {
    const timestamp = this._getTimestamp();
    const shortcode = config.mpesa.businessShortCode;
    const passkey = config.mpesa.passkey;
    const password = this.generatePassword(shortcode, passkey, timestamp);

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId
    };

    try {
      console.log('[SafaricomClient] Sending STK Query Payload to Daraja:', JSON.stringify(payload, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[SafaricomClient] STK Query Response received:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('[SafaricomClient] STK Query Error response:', error.response?.data || error.message);
      this._handleApiError(error, 'STK Push Query');
    }
  }

  /**
   * Private helper to format timestamps in Kenya / East Africa Time (EAT).
   * Used locally to maintain alignment inside the client methods.
   * 
   * @returns {string} Timestamp string (YYYYMMDDHHmmss)
   */
  _getTimestamp() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const getVal = (type) => parts.find(p => p.type === type).value;
    return `${getVal('year')}${getVal('month')}${getVal('day')}${getVal('hour')}${getVal('minute')}${getVal('second')}`;
  }

  /**
   * Standardizes HTTP and API errors thrown by axios requests to Daraja.
   * 
   * @param {Error} error - The caught error object
   * @param {string} action - The action context (e.g. STK Push, Auth)
   * @throws {Error} Enhanced error container with Daraja specifics
   */
  _handleApiError(error, action) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const darajaData = error.response.data;
      const statusCode = error.response.status;
      
      const errorMessage = darajaData.errorMessage || darajaData.errorMessage || darajaData.message || 'Unknown Daraja API error';
      const errorCode = darajaData.errorCode || 'DARAJA_ERROR';

      const customError = new Error(`Daraja ${action} failed [HTTP ${statusCode}] [Code ${errorCode}]: ${errorMessage}`);
      customError.statusCode = statusCode;
      customError.raw = darajaData;
      throw customError;
    } else if (error.request) {
      // The request was made but no response was received
      const networkError = new Error(`No response received from Safaricom Daraja API during ${action}`);
      networkError.statusCode = 503;
      throw networkError;
    } else {
      // Something happened in setting up the request that triggered an Error
      const requestSetupError = new Error(`Request setup error during ${action}: ${error.message}`);
      requestSetupError.statusCode = 500;
      throw requestSetupError;
    }
  }
}

export default new SafaricomClient();
