/**
 * PAYMENT SERVICE
 * 
 * WHY IT EXISTS:
 * This service implements the core business logic and orchestrates workflows for
 * M-Pesa payments. It acts as the mediator between the incoming request data from the controllers
 * and the external communication handled by the Safaricom client.
 * 
 * WHAT IT DOES:
 * - Orchestrates the STK Push request: fetches the OAuth token, formats parameters, and calls the API client.
 * - Orchestrates the STK Push query to check transaction status.
 * - Processes and parses M-Pesa asynchronous callbacks from Safaricom.
 * - Keeps an in-memory registry of received callbacks (for educational inspection).
 * 
 * WHEN IT SHOULD BE USED:
 * This service is called by the PaymentController to process transactions, query statuses,
 * or record incoming callbacks.
 * 
 * ===================================================================================
 * THE COMPLETE STK PUSH (M-PESA EXPRESS) WORKFLOW FOR STUDENTS:
 * ===================================================================================
 * 1. INITIATION (Merchant to M-Pesa API):
 *    - The user inputs their Phone Number and Amount on the client-side app.
 *    - The Merchant Backend receives this request, validates it, and requests an OAuth token.
 *    - The Merchant Backend generates a password using (Shortcode + Passkey + Timestamp).
 *    - The Merchant Backend makes a POST call to Safaricom Daraja STK Push endpoint.
 *    - Safaricom validates the request and returns an immediate response containing:
 *      - MerchantRequestID
 *      - CheckoutRequestID (Unique identifier for tracking the prompt status)
 *      - ResponseCode ("0" means Safaricom received the request and will trigger the prompt)
 *      - ResponseDescription
 * 
 * 2. USER INTERACTION (Safaricom to Customer Phone):
 *    - Safaricom sends a Sim Toolkit (STK) prompt directly to the customer's phone.
 *    - The customer is prompted to enter their M-Pesa PIN to authorize the payment.
 *    - The customer either:
 *      - Enters their PIN (Approves)
 *      - Cancels the prompt (Cancels)
 *      - Ignores the prompt (Timeouts)
 * 
 * 3. ASYNCHRONOUS CALLBACK (Safaricom to Merchant Callback URL):
 *    - Once the customer takes action, Safaricom sends an HTTP POST request to the merchant's 
 *      preconfigured CallBackURL.
 *    - This callback payload contains the final transaction status:
 *      - ResultCode: "0" indicates success; any other code represents cancellation or error (e.g. 1032).
 *      - ResultDesc: Descriptive text (e.g., "The service request is processed successfully.")
 *      - CallbackMetadata: Holds MpesaReceiptNumber, Amount, Date, and Phone Number (if successful).
 * 
 * 4. MERCHANT CONFIRMATION (Polling / Query - Optional):
 *    - If the callback fails to deliver due to network issues, the Merchant Backend can query
 *      the status of the transaction using the CheckoutRequestID at `/mpesa/stkpushquery/v1/query`.
 */

import safaricomClient from '../clients/safaricom.client.js';
import authService from './auth.service.js';
import { formatPhoneNumber } from '../utils/helpers.js';

class PaymentService {
  constructor() {
    // In-memory store for callbacks (to simulate a database for educational inspection)
    this.callbackRegistry = [];
  }

  /**
   * Initiates an STK Push (Lipa Na M-Pesa Online) payment prompt.
   * 
   * @param {object} details - Payment initiation details
   * @param {number|string} details.amount - Amount to charge
   * @param {string} details.phoneNumber - Customer's phone number
   * @param {string} details.reference - Account reference (e.g. Invoice number)
   * @param {string} details.description - Transaction description
   * @returns {Promise<object>} Simplified success response containing Safaricom metadata
   */
  async initiateSTKPush({ amount, phoneNumber, reference, description }) {
    // 1. Format and sanitize phone number (must be 2547XXXXXXXX or 2541XXXXXXXX)
    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!formattedPhone) {
      const error = new Error('Invalid phone number format. Must be a valid Kenyan mobile number.');
      error.statusCode = 400;
      throw error;
    }

    // 2. Fetch active OAuth Access Token from cache or Safaricom API
    const accessToken = await authService.getAccessToken();

    // 3. Trigger the STK Push prompt via the Safaricom client
    const response = await safaricomClient.stkPush({
      accessToken,
      amount,
      phoneNumber: formattedPhone,
      reference: reference || 'DEMO_ACC',
      description: description || 'Mpesa STK Demo Payment'
    });

    // 4. Return formatted response details to the controller
    return {
      merchantRequestId: response.MerchantRequestID,
      checkoutRequestId: response.CheckoutRequestID,
      responseCode: response.ResponseCode,
      responseDescription: response.ResponseDescription,
      customerMessage: response.CustomerMessage
    };
  }

  /**
   * Queries the status of an initiated STK Push transaction.
   * 
   * @param {string} checkoutRequestId - Unique ID returned when initiating STK Push
   * @returns {Promise<object>} Detailed transaction status response from Daraja
   */
  async queryTransactionStatus(checkoutRequestId) {
    // 1. Fetch active OAuth Access Token
    const accessToken = await authService.getAccessToken();

    // 2. Query Status using Safaricom Client
    const response = await safaricomClient.querySTK({
      accessToken,
      checkoutRequestId
    });

    // 3. Return formatted status output
    return {
      merchantRequestId: response.MerchantRequestID,
      checkoutRequestId: response.CheckoutRequestID,
      resultCode: response.ResultCode,
      resultDescription: response.ResultDesc
    };
  }

  /**
   * Processes the asynchronous callback received from Safaricom Daraja.
   * 
   * @param {object} callbackData - Raw callback payload from Safaricom
   * @returns {object} Formatted parsed transaction details
   */
  processCallback(callbackData) {
    console.log('[PaymentService] Processing raw Safaricom Callback...');
    
    // Safaricom sends data in a specific nested JSON structure: Body.stkCallback
    const stkCallback = callbackData?.Body?.stkCallback;
    if (!stkCallback) {
      throw new Error('Invalid callback payload structure: Missing Body.stkCallback');
    }

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    // Structure the base result
    const transaction = {
      merchantRequestId: MerchantRequestID,
      checkoutRequestId: CheckoutRequestID,
      resultCode: ResultCode,
      resultDescription: ResultDesc,
      status: ResultCode === 0 ? 'SUCCESS' : 'FAILED',
      timestamp: new Date().toISOString(),
      metadata: {}
    };

    // Extract metadata values if result is successful (ResultCode 0)
    // Safaricom structures CallbackMetadata as an array of { Name: '...', Value: '...' }
    if (ResultCode === 0 && CallbackMetadata && Array.isArray(CallbackMetadata.Item)) {
      const items = CallbackMetadata.Item;
      
      const amountItem = items.find(item => item.Name === 'Amount');
      const receiptItem = items.find(item => item.Name === 'MpesaReceiptNumber');
      const dateItem = items.find(item => item.Name === 'TransactionDate');
      const phoneItem = items.find(item => item.Name === 'PhoneNumber');

      transaction.metadata = {
        amount: amountItem ? amountItem.Value : null,
        mpesaReceiptNumber: receiptItem ? receiptItem.Value : null,
        transactionDate: dateItem ? this._parseDarajaDate(dateItem.Value) : null,
        phoneNumber: phoneItem ? phoneItem.Value : null
      };
    }

    // Save transaction callback to our in-memory registry for inspection
    // Limit to last 100 transactions to manage memory usage
    this.callbackRegistry.unshift(transaction);
    if (this.callbackRegistry.length > 100) {
      this.callbackRegistry.pop();
    }

    console.log(`[PaymentService] Callback processed. CheckoutRequestID: ${CheckoutRequestID}. Status: ${transaction.status}`);
    if (transaction.status === 'SUCCESS') {
      console.log(`[PaymentService] Payment Success! Receipt: ${transaction.metadata.mpesaReceiptNumber}, Amount: Kes ${transaction.metadata.amount}`);
    } else {
      console.log(`[PaymentService] Payment Failed/Cancelled. Code: ${ResultCode}, Reason: ${ResultDesc}`);
    }

    return transaction;
  }

  /**
   * Retrieves the local in-memory registry of received callbacks.
   * Useful for students to inspect callbacks when testing locally.
   * 
   * @returns {Array<object>} List of processed callbacks
   */
  getCallbacks() {
    return this.callbackRegistry;
  }

  /**
   * Helper to parse Safaricom's custom date string format (e.g. 20260716223540)
   * into a readable ISO date format.
   * 
   * @param {string|number} rawDate - Date in format YYYYMMDDHHmmss
   * @returns {string} ISO Date string
   */
  _parseDarajaDate(rawDate) {
    const str = String(rawDate);
    if (str.length !== 14) return str;

    const year = str.substring(0, 4);
    const month = str.substring(4, 6);
    const day = str.substring(6, 8);
    const hour = str.substring(8, 10);
    const minute = str.substring(10, 12);
    const second = str.substring(12, 14);

    return `${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`; // EAT timezone offset
  }
}

export default new PaymentService();
