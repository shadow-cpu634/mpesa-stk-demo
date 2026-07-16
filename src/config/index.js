/**
 * CONFIGURATION MODULE
 * 
 * WHY IT EXISTS:
 * Centralizing environment variables in one module ensures the application has a single, 
 * predictable source of truth for configuration. It avoids having process.env scattered 
 * throughout the codebase, making maintenance, validation, and testing much easier.
 * 
 * WHAT IT DOES:
 * - Loads environment variables from the .env file using dotenv.
 * - Parses and converts configurations to appropriate types (e.g., numbers, booleans).
 * - Exports a read-only configuration object.
 * - Validates that essential environment variables are defined.
 * 
 * WHEN IT SHOULD BE USED:
 * Import this module whenever you need to access configuration values (like API keys, ports, 
 * database URLs) anywhere in the application layers.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the .env file in the project root
dotenv.config();

const requiredEnvVars = [
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET',
  'MPESA_BUSINESS_SHORTCODE',
  'MPESA_PASSKEY',
  'MPESA_CALLBACK_URL'
];

// Check for missing required environment variables to prevent runtime failures
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn(
    `[WARNING]: The following environment variables are missing: ${missingEnvVars.join(', ')}.\n` +
    `Ensure you create a .env file and specify these values to make successful M-Pesa requests.`
  );
}

export const config = {
  // Application Settings
  port: parseInt(process.env.PORT, 10) || 3000,
  env: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api',

  // M-Pesa Daraja API Settings
  mpesa: {
    baseUrl: process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke',
    consumerKey: process.env.MPESA_CONSUMER_KEY || 'YOUR_DARAJA_CONSUMER_KEY',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || 'YOUR_DARAJA_CONSUMER_SECRET',
    businessShortCode: process.env.MPESA_BUSINESS_SHORTCODE || '174379',
    passkey: process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
    callbackUrl: process.env.MPESA_CALLBACK_URL || 'https://your-public-domain.com/api/payments/callback',
    
    // Testing credentials
    initiatorName: process.env.MPESA_INITIATOR_NAME || 'testapi',
    initiatorPassword: process.env.MPESA_INITIATOR_PASSWORD || 'Safaricom123!!',
    partyA: process.env.MPESA_PARTY_A || '600981',
    partyB: process.env.MPESA_PARTY_B || '600000',
    testPhoneNumber: process.env.TEST_PHONE_NUMBER || '254708374149'
  }
};

export default config;
