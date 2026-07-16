# Safaricom M-Pesa Daraja API Express (STK Push) Demo

An educational, production-quality backend application designed to teach university students and developers how to integrate Safaricom's M-Pesa Express (STK Push) API using Node.js, Express.js, and ES Modules.

---

## 📖 Table of Contents
- [Project Overview](#project-overview)
- [Architecture & Layered Structure](#architecture--layered-structure)
- [Folder Structure](#folder-structure)
- [How It Works](#how-it-works)
  - [1. OAuth 2.0 Access Token Generation](#1-oauth-20-access-token-generation)
  - [2. STK Push Workflow](#2-stk-push-workflow)
  - [3. Callback / Webhook Processing](#3-callback--webhook-processing)
- [Installation & Local Setup](#installation--local-setup)
- [Environment Variables](#environment-variables)
- [How to Run](#how-to-run)
- [Testing Endpoints](#testing-endpoints)
  - [Testing via Swagger](#testing-via-swagger)
  - [Testing via Postman](#testing-via-postman)
- [Sample Requests & Responses](#sample-requests--responses)
- [Common Daraja Errors & Troubleshooting](#common-daraja-errors--troubleshooting)

---

## 🌟 Project Overview
Integrating payments is a core skill for modern full-stack and backend engineers. This project isolates Safaricom M-Pesa Express integration details from databases or complex business flows, providing a clean, sandbox-ready environment.

It demonstrates production best practices:
- **Clean Layered Architecture** (Separate routes, controllers, services, clients, and middleware).
- **In-Memory Caching** of OAuth Access Tokens to prevent hitting Safaricom servers on every request (avoiding rate-limiting and improving request speeds).
- **Robust Validation** using `express-validator` to ensure correct schemas prior to sending request payloads.
- **Centralized Error Handling** that gracefully handles both local application errors and Safaricom response errors.
- **Interactive API Documentation** using Swagger UI.

---

## 🏗️ Architecture & Layered Structure
This project implements a **layered architecture**, separating concerns so each file has exactly *one responsibility*:

```
               ┌──────────────────────────────┐
               │         HTTP Clients         │
               │      (Postman / Browser)     │
               └──────────────┬───────────────┘
                              │ HTTP Requests
                              ▼
               ┌──────────────────────────────┐
               │         Routes Layer         │
               │   (Defines API Endpoints)    │
               └──────────────┬───────────────┘
                              │
                              ▼
               ┌──────────────────────────────┐
               │      Controllers Layer       │
               │ (Validates input, sends res) │
               └──────────────┬───────────────┘
                              │
                              ▼
               ┌──────────────────────────────┐
               │        Services Layer        │
               │ (Business Logic & Workflows) │
               └──────────────┬───────────────┘
                              │
                              ▼
               ┌──────────────────────────────┐
               │      Safaricom Client        │
               │ (External Daraja API Comm)   │
               └──────────────────────────────┘
```

1. **Routes**: Maps HTTP request verbs and paths to specific controller actions. It does not handle validation or response processing.
2. **Validators**: Checks body fields (like `phoneNumber` and `amount`) using validation chains before passing data to controllers.
3. **Controllers**: Receives incoming requests, ensures parameters are validated, delegates task orchestration to services, and returns a standardized JSON response format.
4. **Services**: Implements business rules and coordinates multi-step actions (e.g. "fetch access token, generate password, trigger payment").
5. **Clients**: Manages external HTTP integrations (via Axios) to communicate directly with Safaricom.
6. **Middleware**: Contains logging configurations (Morgan), global error formatting, and 404 handler routines.

---

## 📁 Folder Structure
The codebase is structured logically:

```
mpesa-stk-demo/
├── src/
│   ├── config/              # App & API Environment configs
│   │   └── index.js
│   ├── routes/              # Express API route endpoints
│   │   ├── auth.routes.js
│   │   ├── health.routes.js
│   │   └── payment.routes.js
│   ├── controllers/         # Handles HTTP Request/Response cycles
│   │   ├── auth.controller.js
│   │   ├── health.controller.js
│   │   └── payment.controller.js
│   ├── services/            # Core business workflows & token cache logic
│   │   ├── auth.service.js
│   │   └── payment.service.js
│   ├── clients/             # Connects directly to external Safaricom APIs
│   │   └── safaricom.client.js
│   ├── middleware/          # Logger, NotFound, and centralized Error handlers
│   │   ├── error.middleware.js
│   │   ├── logging.middleware.js
│   │   └── notfound.middleware.js
│   ├── validators/          # Input schema filters (express-validator)
│   │   └── payment.validator.js
│   ├── utils/               # Formatters and time-zone helpers
│   │   └── helpers.js
│   ├── docs/                # OpenAPI Swagger specifications
│   │   └── swagger.js
│   ├── app.js               # Express application initialization
│   └── server.js            # Node HTTP server entry point & OS signal monitor
├── .env.example             # Template for required environment variables
├── package.json             # NPM dependencies and run scripts
├── postman_collection.json  # Predefined requests for direct Postman testing
└── README.md                # Documentation guide
```

---

## 🛠️ How It Works

### 1. OAuth 2.0 Access Token Generation
To query or request payments, the backend must authenticate with Safaricom using OAuth 2.0.
1. The client sends basic credentials (Consumer Key + Consumer Secret) combined as a base64 string: `Base64(ConsumerKey:ConsumerSecret)` as an HTTP `Authorization` Basic header.
2. The client calls `GET https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`.
3. Safaricom returns an access token valid for 3599 seconds (~1 hour).
4. **Caching**: Rather than calling Safaricom before every transaction (which adds network latency and risks hitting rate limits), our `AuthService` caches this token in memory. It is only refreshed when the token is within 60 seconds of expiring.

---

### 2. STK Push Workflow
Also called **M-Pesa Express** (Lipa Na M-Pesa Online). It prompts the customer to enter their PIN.

```
┌─────────┐             ┌──────────┐             ┌───────────┐             ┌─────────┐
│  User   │             │ Backend  │             │ Safaricom │             │ Handset │
│  Phone  │             │  Server  │             │  Daraja   │             │ (M-Pesa)│
└────┬────┘             └────┬─────┘             └─────┬─────┘             ────┬────
     │ Input Amt/Phone       │                         │                       │
     │──────────────────────>│                         │                       │
     │                       │ 1. Fetch OAuth Token    │                       │
     │                       │────────────────────────>│                       │
     │                       │    Return Access Token  │                       │
     │                       │<────────────────────────│                       │
     │                       │                         │                       │
     │                       │ 2. Post STK Push        │                       │
     │                       │────────────────────────>│                       │
     │                       │    Instant Resp (Code 0)│                       │
     │                       │<────────────────────────│                       │
     │                       │                         │                       │
     │                       │                         │ 3. Push PIN Prompt    │
     │                       │                         │──────────────────────>│
     │                       │                         │                       │
     │                       │                         │    User Inputs PIN    │
     │                       │                         │<──────────────────────│
     │                       │                         │                       │
     │                       │ 4. Send POST Callback   │                       │
     │                       │<────────────────────────│                       │
     │                       │    Return HTTP 200      │                       │
     │                       │────────────────────────>│                       │
```

- **Password Generation**: Safaricom requires a unique request password, which is generated by concatenating: `BusinessShortcode + Passkey + Timestamp` and encoding it in Base64.
- **Timestamp**: Formatted exactly as `YYYYMMDDHHmmss` in East Africa Time (EAT, UTC+3) as Safaricom is situated in Kenya.

---

### 3. Callback / Webhook Processing
Because the payment flow involves user physical interaction (handset PIN prompt), the transaction is asynchronous:
1. When we trigger `stkPush`, Safaricom returns an immediate acknowledgement containing a `CheckoutRequestID`.
2. The user inputs their PIN, cancels, or times out.
3. Safaricom receives this result and makes a `POST` request to our `MPESA_CALLBACK_URL`.
4. Our server processes the JSON callback structure:
   - Successful transaction metadata (Receipt No, Amount, Phone Number, Date) is extracted if `ResultCode` is `0`.
   - Failure reports are compiled if `ResultCode` is non-zero (e.g. `1032` for cancelled).
5. We respond to Safaricom with `ResponseCode: "0"`, signaling receipt so Safaricom doesn't retry.

---

## ⚙️ Environment Variables
Create a `.env` file in the root directory. Copy the structure from `.env.example`. Below are the environment configurations:

| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | Local network port the server runs on | `3000` |
| `NODE_ENV` | Application environment (development/production) | `development` |
| `API_PREFIX` | Base prefix route for endpoints | `/api` |
| `MPESA_BASE_URL` | Safaricom Sandbox/Production gateway URL | `https://sandbox.safaricom.co.ke` |
| `MPESA_CONSUMER_KEY` | Daraja application Consumer Key | *Get from developer portal* |
| `MPESA_CONSUMER_SECRET` | Daraja application Consumer Secret | *Get from developer portal* |
| `MPESA_BUSINESS_SHORTCODE` | Merchant Shortcode (Sandbox default is 174379) | `174379` |
| `MPESA_PASSKEY` | Lipa Na M-Pesa Online Passkey | *Provided in .env template* |
| `MPESA_CALLBACK_URL` | Public webhook URL where Safaricom sends payment results | `https://your-domain.ngrok-free.app/api/payments/callback` |

> [!IMPORTANT]
> Because Safaricom must send requests to your server callback, your `MPESA_CALLBACK_URL` must be **publicly accessible**. When coding locally, use a tool like **ngrok** to tunnel traffic:
> `ngrok http 3000`
> Then set `MPESA_CALLBACK_URL=https://<your-ngrok-subdomain>.ngrok-free.app/api/payments/callback`.

---

## 🚀 Installation & Local Setup

1. **Clone and Navigate**:
   ```bash
   git clone <repository_url>
   cd mpesa-stk-demo
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Create a `.env` file from the template:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` to include your specific credentials and configurations.*

---

## 🏃 How to Run

### Development Mode (with hot-reloading)
Runs Nodemon to automatically restart the server when files change:
```bash
npm run dev
```

### Production Mode
Runs standard Node execution:
```bash
npm start
```

---

## 🧪 Testing Endpoints

### Testing via Swagger
Once the server is running, navigate to:
👉 **[http://localhost:3000/docs](http://localhost:3000/docs)**

This opens the Swagger UI where you can inspect schemas and test endpoints (e.g. click "Try it out" and execute requests directly from the UI).

### Testing via Postman
1. Open Postman.
2. Click **Import** in the top left.
3. Choose the [postman_collection.json](file:///home/activator/Projects/react/mpesa-stk-demo./postman_collection.json) file from this project root.
4. The collection imports variables like `{{base_url}}` (defaulting to `http://localhost:3000`) and `{{phone_number}}` (defaulting to `254708374149`).
5. Run the **Generate Access Token** request to confirm connection.

---

## 📋 Sample Requests & Responses

### 1. Health Status (`GET /api/health`)
**Response (200 OK):**
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

### 2. OAuth Token (`GET /api/auth/token`)
**Response (200 OK):**
```json
{
  "success": true,
  "message": "M-Pesa OAuth Access Token generated successfully.",
  "data": {
    "accessToken": "cGFzc3dvcmQxMjM0NTY3ODkwYWJjZGVm",
    "tokenType": "Bearer",
    "expiresIn": "Check console logs for absolute cache expiry timestamp"
  }
}
```

### 3. Initiate STK Push (`POST /api/payments/stkpush`)
**Request Body:**
```json
{
  "amount": 1,
  "phoneNumber": "254708374149",
  "reference": "INV001",
  "description": "Payment"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "STK Push payment prompt initiated successfully. Check your handset for the M-Pesa PIN prompt.",
  "data": {
    "merchantRequestId": "12345-67890-1",
    "checkoutRequestId": "ws_CO_16072026223540892",
    "responseCode": "0",
    "responseDescription": "Success. Request accepted for processing",
    "customerMessage": "Success. Request accepted for processing"
  }
}
```

### 4. Query STK Status (`POST /api/payments/query`)
**Request Body:**
```json
{
  "checkoutRequestId": "ws_CO_16072026223540892"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "STK Push transaction query completed.",
  "data": {
    "merchantRequestId": "12345-67890-1",
    "checkoutRequestId": "ws_CO_16072026223540892",
    "resultCode": "0",
    "resultDescription": "The service request is processed successfully."
  }
}
```

### 5. Safaricom Asynchronous Callback Webhook (`POST /api/payments/callback`)
**Safaricom POST Request Body:**
```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "12345-67890-1",
      "CheckoutRequestID": "ws_CO_16072026223540892",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 1.00 },
          { "Name": "MpesaReceiptNumber", "Value": "NL12345678" },
          { "Name": "Balance", "Value": 0.00 },
          { "Name": "TransactionDate", "Value": 20260716223540 },
          { "Name": "PhoneNumber", "Value": 254708374149 }
        ]
      }
    }
  }
}
```
**Response sent back to Safaricom (200 OK):**
```json
{
  "ResponseCode": "0",
  "ResponseDesc": "Callback received and processed successfully"
}
```

---

## ❌ Common Daraja Errors & Troubleshooting

1. **`HTTP 400 [Code 400.002.02]: Invalid Access Token`**:
   - **Reason**: The access token sent in the request header is invalid or has expired.
   - **Fix**: Clear the local cache or reboot the server to generate a fresh token.

2. **`HTTP 400 [Code 400.002.05]: Invalid phone number format`**:
   - **Reason**: The phone number did not match Kenyan standard prefix (e.g. sent local `07...` directly to Daraja instead of standard international prefix `2547...`).
   - **Fix**: Our backend formats the phone number helper automatically. Ensure the raw input contains a valid 9-12 digit Kenyan number format.

3. **`HTTP 500 [Code 500.001.1001]: Internal System Error`**:
   - **Reason**: Safaricom is undergoing maintenance or the sandbox credentials provided are mismatched.
   - **Fix**: Check the status of Safaricom Daraja services or double-check credentials.

4. **`ResultCode 1032` (in Callback logs)**:
   - **Reason**: The user clicked "Cancel" on their phone prompt, rejecting the transaction.

5. **`ResultCode 1037` (in Callback logs)**:
   - **Reason**: The PIN prompt timed out (the user didn't enter their PIN within the 30-60 second window).

6. **`ResultCode 1` (in Callback logs)**:
   - **Reason**: The customer has insufficient funds in their M-Pesa account to cover the payment.

---

## 🛠️ Troubleshooting Callbacks Locally
Because Safaricom runs on public servers, it cannot send payment callbacks directly to your `http://localhost:3000` port. 

To test callbacks:
1. Run **ngrok**:
   ```bash
   ngrok http 3000
   ```
2. Copy the secure forwarding URL (e.g., `https://a1b2-34-56-78.ngrok-free.app`).
3. Set `MPESA_CALLBACK_URL` in your `.env` to:
   `https://a1b2-34-56-78.ngrok-free.app/api/payments/callback`
4. Reboot the server.
5. Alternatively, you can use the **Simulate Safaricom Callback Hook** request inside the Postman collection to send dummy callback payloads directly to your local endpoint.
6. Call `GET /api/payments/callback` to inspect the received logs inside the in-memory array.
