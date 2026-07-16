/**
 * REQUEST LOGGING MIDDLEWARE
 * 
 * WHY IT EXISTS:
 * Keeping track of incoming HTTP requests helps developers debug API flows, monitor
 * latency, and identify failing endpoints in real-time.
 * 
 * WHAT IT DOES:
 * - Configures Morgan, a popular HTTP request logger middleware for Node.js.
 * - Chooses the logging output style based on the environment (dev vs production).
 * 
 * WHEN IT SHOULD BE USED:
 * Imported and registered in app.js near the top of the middleware stack so it logs
 * every single incoming request.
 */

import morgan from 'morgan';
import config from '../config/index.js';

// Determine logging style: 'dev' prints concise colored status logs,
// 'combined' prints standard Apache style logs for production.
const format = config.env === 'production' ? 'combined' : 'dev';

export const requestLogger = morgan(format);

export default requestLogger;
