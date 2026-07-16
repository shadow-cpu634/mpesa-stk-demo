/**
 * HTTP LISTENING SERVER (server.js)
 * 
 * WHY IT EXISTS:
 * This file is the entry point for starting the web server. It binds our configured Express 
 * application to a network port and listens for incoming socket connections. It also isolates 
 * runtime server lifecycle hooks (startup messages, process termination signals) from the application configurations.
 * 
 * WHAT IT DOES:
 * - Imports the configured app.js and port configurations.
 * - Starts the server on the specified port.
 * - Listens for critical OS signals (SIGTERM, SIGINT) to perform graceful shutdowns.
 * - Catches uncaught exceptions or unhandled promise rejections to prevent silent server crashes.
 * 
 * WHEN IT SHOULD BE USED:
 * Executed via 'npm start' or 'npm run dev' to boot the backend environment.
 */

import app from './app.js';
import config from './config/index.js';

const server = app.listen(config.port, () => {
  console.log('================================================================');
  console.log(`[INFO] M-PESA STK DEMO SERVER RUNNING IN [${config.env.toUpperCase()}] MODE`);
  console.log(`[INFO] Port: ${config.port}`);
  console.log(`[INFO] Local Server: http://localhost:${config.port}`);
  console.log(`[INFO] API Documentation: http://localhost:${config.port}/docs`);
  console.log('================================================================');
});

// ==============================================================================
// PROCESS EXCEPTION MONITORING
// ==============================================================================
// Catch synchronous runtime errors that were not handled within try-catch blocks
process.on('uncaughtException', (error) => {
  console.error('[CRITICAL] Uncaught Exception occurred at server startup or execution:', error);
  // Gracefully exit process to allow process managers (like PM2 or Docker) to reboot the container
  process.exit(1);
});

// Catch asynchronous errors (Promises) that were rejected and not caught
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Promise Rejection at:', promise, 'reason:', reason);
  // Gracefully exit
  process.exit(1);
});

// ==============================================================================
// GRACEFUL SHUTDOWN LOGIC
// ==============================================================================
// Handles graceful shutdowns when termination signals are received (e.g. from Docker/K8s/PM2)
const shutdownGracefully = (signal) => {
  console.log(`[SHUTDOWN] Received signal ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('[SHUTDOWN] HTTP server closed. Releasing resources...');
    // Close database connections or file streams here if any
    console.log('[SHUTDOWN] Graceful shutdown completed. Exiting process.');
    process.exit(0);
  });

  // Force shutdown after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error('[SHUTDOWN] Graceful shutdown timed out. Forcing termination.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));
process.on('SIGINT', () => shutdownGracefully('SIGINT'));
