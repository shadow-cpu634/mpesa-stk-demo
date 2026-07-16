/**
 * UTILS / HELPERS
 * 
 * WHY IT EXISTS:
 * This file provides utility functions that perform common, formatting, conversion, and
 * date-time operations. By separating helper logic from services and controllers, we maintain
 * clean code separation and dry principles.
 * 
 * WHAT IT DOES:
 * - Formats dates into M-Pesa compliant YYYYMMDDHHmmss format in East Africa Time (UTC+3).
 * - Sanitizes and formats phone numbers to standard format (2547XXXXXXXX or 2541XXXXXXXX).
 * - Standardizes error handling and formatting for consistency.
 * 
 * WHEN IT SHOULD BE USED:
 * Use these helper functions throughout services, clients, and controllers when format operations
 * or phone sanitization is needed.
 */

/**
 * Generates an M-Pesa compliant timestamp in East Africa Time (EAT / UTC+3).
 * Format: YYYYMMDDHHmmss
 * 
 * @returns {string} Formatted timestamp string of 14 characters
 */
export const getEATTimestamp = () => {
  const now = new Date();
  
  // Use Intl.DateTimeFormat to force Africa/Nairobi timezone (EAT, UTC+3)
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
  
  // Extract parts and assemble YYYYMMDDHHmmss
  const year = getVal('year');
  const month = getVal('month');
  const day = getVal('day');
  const hour = getVal('hour');
  const minute = getVal('minute');
  const second = getVal('second');
  
  return `${year}${month}${day}${hour}${minute}${second}`;
};

/**
 * Sanitizes phone numbers to standard international format (2547XXXXXXXX or 2541XXXXXXXX).
 * Supports standard local formats:
 * - 0712345678 -> 254712345678
 * - +254712345678 -> 254712345678
 * - 712345678 -> 254712345678
 * - 254712345678 -> 254712345678
 * 
 * @param {string} phoneNumber - Raw phone number input
 * @returns {string|null} Sanitized phone number or null if invalid
 */
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return null;
  
  // Remove all non-digit characters
  let cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // If starts with +254 or 254 and has 12 digits
  if (cleanNumber.startsWith('254') && cleanNumber.length === 12) {
    return cleanNumber;
  }
  
  // If starts with 0 and has 10 digits (e.g. 0712345678)
  if (cleanNumber.startsWith('0') && cleanNumber.length === 10) {
    return '254' + cleanNumber.substring(1);
  }
  
  // If has 9 digits without leading 0 (e.g. 712345678)
  if (cleanNumber.length === 9 && (cleanNumber.startsWith('7') || cleanNumber.startsWith('1'))) {
    return '254' + cleanNumber;
  }
  
  return null; // Return null if format doesn't match standard Kenyan phone numbers
};
