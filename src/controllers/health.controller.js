/**
 * HEALTH CONTROLLER
 * 
 * WHY IT EXISTS:
 * A health controller provides a public endpoint to verify that the application is running,
 * responsive, and healthy. It is used in production by monitoring tools, load balancers, 
 * or developers to verify system state.
 * 
 * WHAT IT DOES:
 * - Checks current application runtime variables (uptime, memory, process environment).
 * - Returns a standardized success API response with health data.
 * 
 * WHEN IT SHOULD BE USED:
 * Bound to the health routes (/api/health) to serve checking queries.
 */

import config from '../config/index.js';

/**
 * Checks and returns application status metrics.
 * 
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
export const checkHealth = (req, res) => {
  const healthData = {
    status: 'UP',
    environment: config.env,
    uptime: `${process.uptime().toFixed(2)} seconds`,
    timestamp: new Date().toISOString(),
    memoryUsage: {
      rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
    },
    nodeVersion: process.version
  };

  res.status(200).json({
    success: true,
    message: 'M-Pesa STK Demo API is fully operational.',
    data: healthData
  });
};
