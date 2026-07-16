# Safaricom M-Pesa STK Push Demo API (OAS 3.0)

This is the developer guide and API handbook for the **M-Pesa STK Push Demo API (1.0.0)**. It details how the API endpoints behave, their schemas, and how to change parameters (like the phone number, amount, and reference names) to test live payments in the sandbox.

---

## How to Customize Test Parameters

When testing the STK Push endpoint (`POST /api/payments/stkpush`), you can customize the payment destination number, charge amount, reference, and description in several ways.

### 1. Modifying the Swagger Documentation Defaults
If you want to change the default values that auto-populate the Swagger UI test panel:
*   **File location:** Open `src/docs/swagger.js`
*   **Modifying the Schema:** Scroll down to the `STKPushRequest` component schema. You will find:
    ```javascript
    STKPushRequest: {
      type: 'object',
      required: ['amount', 'phoneNumber'],
      properties: {
        amount: {
          type: 'number',
          description: 'The amount of money to request (KES).',
          example: 1.00 // Change this default amount
        },
        phoneNumber: {
          type: 'string',
          description: 'The customer phone number to receive the prompt.',
          example: '254714747942' // Change this default phone number
        },
        reference: {
          type: 'string',
          description: 'Payment reference matching an invoice (max 12 chars).',
          example: 'INV001' // Change this default reference
        },
        description: {
          type: 'string',
          description: 'Description of payment (max 18 chars).',
          example: 'Tuition Payment' // Change this default description
        }
      }
    }
    ```
*   Save the file. When you refresh `http://localhost:3000/docs`, the form will populate with your updated parameters automatically.

### 2. Modifying Environment Default Values
*   **File location:** Open the `.env` file in the project root.
*   **Modifying values:**
    *   Change the default phone number: `TEST_PHONE_NUMBER=254714747942`
    *   Change the Business ShortCode: `MPESA_BUSINESS_SHORTCODE=174379`
    *   Change the Lipa Na M-Pesa online passkey: `MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919`

### 3. Modifying Postman Environment Variables
*   **File location:** Open `postman_collection.json` or update inside your Postman app.
*   **Modifying variables:** Locate the `"variable"` block at the bottom of the collection. Change the values for:
    *   `phone_number`: Current default is `"254714747942"`.
    *   `base_url`: Current default is `"http://localhost:3000"`.

---

## API Endpoints Reference

All paths are prefixed with the base API prefix. By default, this is `/api`.

### 1. System Health Status
*   **Endpoint:** `GET /api/health`
*   **Description:** Verifies that the server is online and returns uptime, memory status, and Node environment parameters.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "M-Pesa STK Demo API is fully operational.",
      "data": {
        "status": "UP",
        "environment": "development",
        "uptime": "15.42 seconds",
        "timestamp": "2026-07-16T22:38:00.000Z",
        "memoryUsage": {
          "rss": "34.12 MB",
          "heapTotal": "16.12 MB",
          "heapUsed": "8.50 MB"
        },
        "nodeVersion": "v20.11.0"
      }
    }
    ```

### 2. Generate Access Token
*   **Endpoint:** `GET /api/auth/token`
*   **Description:** Generates a fresh OAuth Access Token from Safaricom Daraja, or returns the cached active token if it has not expired to prevent rate limits.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "M-Pesa OAuth Access Token generated successfully.",
      "data": {
        "accessToken": "uJDVQKu4wksmdSRp7ha7MtTn9gTq",
        "tokenType": "Bearer",
        "expiresIn": "Check console logs for absolute cache expiry timestamp"
      }
    }
    ```

### 3. Initiate STK Push Payment Prompt
*   **Endpoint:** `POST /api/payments/stkpush`
*   **Description:** Requests Safaricom to trigger an M-Pesa PIN prompt (STK Push) on the specified phone number.
*   **Request Body Schema:**
    | Parameter | Type | Required | Limit | Example |
    | :--- | :--- | :--- | :--- | :--- |
    | `amount` | Number | Yes | Must be > 0 | `1.00` |
    | `phoneNumber` | String | Yes | Kenyan format (`2547...` or `07...`) | `"254714747942"` |
    | `reference` | String | No | Max 12 characters | `"INV001"` |
    | `description` | String | No | Max 18 characters | `"Tuition Payment"` |

*   **Sample Body JSON:**
    ```json
    {
      "amount": 1,
      "phoneNumber": "254714747942",
      "reference": "INV001",
      "description": "Tuition Payment"
    }
    ```

*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "STK Push payment prompt initiated successfully. Check your handset for the M-Pesa PIN prompt.",
      "data": {
        "merchantRequestId": "22bc-440c-ac2e-85e124b6bec4171460",
        "checkoutRequestId": "ws_CO_16072026230016542714747942",
        "responseCode": "0",
        "responseDescription": "Success. Request accepted for processing",
        "customerMessage": "Success. Request accepted for processing"
      }
    }
    ```

*   **Validation Failure Response (400 Bad Request):**
    ```json
    {
      "success": false,
      "message": "Request validation failed.",
      "errors": [
        {
          "field": "description",
          "message": "Transaction Description must be between 1 and 18 characters (Daraja limit)."
        }
      ]
    }
    ```

### 4. Query STK Push Status
*   **Endpoint:** `POST /api/payments/query`
*   **Description:** Queries Safaricom's servers to check the current status of an STK Push payment using the `checkoutRequestId`.
*   **Request Body JSON:**
    ```json
    {
      "checkoutRequestId": "ws_CO_16072026230016542714747942"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "STK Push transaction query completed.",
      "data": {
        "merchantRequestId": "22bc-440c-ac2e-85e124b6bec4171460",
        "checkoutRequestId": "ws_CO_16072026230016542714747942",
        "resultCode": "0",
        "resultDescription": "The service request is processed successfully."
      }
    }
    ```

### 5. Callback Endpoint (Safaricom Webhook)
*   **Endpoint (POST):** `POST /api/payments/callback`
*   **Description:** The webhook url registered on Daraja where Safaricom posts the transaction result asynchronously after user PIN entry.
*   **Webhook Request Body (Sent by Safaricom):**
    ```json
    {
      "Body": {
        "stkCallback": {
          "MerchantRequestID": "22bc-440c-ac2e-85e124b6bec4171460",
          "CheckoutRequestID": "ws_CO_16072026230016542714747942",
          "ResultCode": 0,
          "ResultDesc": "The service request is processed successfully.",
          "CallbackMetadata": {
            "Item": [
              { "Name": "Amount", "Value": 1.00 },
              { "Name": "MpesaReceiptNumber", "Value": "NL12345678" },
              { "Name": "Balance", "Value": 0.00 },
              { "Name": "TransactionDate", "Value": 20260716223540 },
              { "Name": "PhoneNumber", "Value": 254714747942 }
            ]
          }
        }
      }
    }
    ```
*   **Response returned to Safaricom:**
    ```json
    {
      "ResponseCode": "0",
      "ResponseDesc": "Callback received and processed successfully"
    }
    ```

### 6. List Callback History
*   **Endpoint (GET):** `GET /api/payments/callback`
*   **Description:** Retrieves the list of recently processed callbacks currently stored in the server's memory. This is highly useful for testing webhook processing locally.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Recent received M-Pesa callbacks retrieved successfully.",
      "data": {
        "count": 1,
        "callbacks": [
          {
            "merchantRequestId": "22bc-440c-ac2e-85e124b6bec4171460",
            "checkoutRequestId": "ws_CO_16072026230016542714747942",
            "resultCode": 0,
            "resultDescription": "The service request is processed successfully.",
            "status": "SUCCESS",
            "timestamp": "2026-07-16T22:36:12.000Z",
            "metadata": {
              "amount": 1,
              "mpesaReceiptNumber": "NL12345678",
              "transactionDate": "2026-07-16T22:35:40+03:00",
              "phoneNumber": 254714747942
            }
          }
        ]
      }
    }
    ```

---

## How to Run the Application

Follow these steps to run and inspect the application:

1.  **Install project dependencies:**
    ```bash
    npm install
    ```
2.  **Configure Environment Variables:**
    Copy `.env.example` to `.env` and fill in your keys:
    ```bash
    cp .env.example .env
    ```
3.  **Run in Development Mode:**
    Runs the Nodemon server for hot-reloading:
    ```bash
    npm run dev
    ```
4.  **Open API Documentation:**
    Launch your browser and navigate to:
    `http://localhost:3000/docs`
