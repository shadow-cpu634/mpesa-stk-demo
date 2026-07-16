/**
 * EXPRESS APPLICATION INSTANTIATION & SETUP (app.js)
 * 
 * WHY IT EXISTS:
 * Separating the express app setup (routes, middlewares) from the actual network listener 
 * (server.js) is a standard backend practice. It makes integration testing much simpler 
 * because you can test the routes and controllers in-memory without binding the app to 
 * a physical network port.
 * 
 * WHAT IT DOES:
 * - Initializes the Express application.
 * - Configures core HTTP security headers via Helmet.
 * - Enables CORS to permit clients (like web frontends) to consume the API.
 * - Mounts middleware for logging (Morgan) and body parsers (JSON, urlencoded).
 * - Binds API route layers.
 * - Serves the Swagger UI API documentation.
 * - Sets up 404 and global error handlers.
 * 
 * WHEN IT SHOULD BE USED:
 * This file is imported by server.js to launch the actual HTTP listening server, 
 * or inside test suites to execute integration tests.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import config from './config/index.js';
import requestLogger from './middleware/logging.middleware.js';
import errorHandler from './middleware/error.middleware.js';
import notFoundHandler from './middleware/notfound.middleware.js';
import swaggerSpec from './docs/swagger.js';

// Route Imports
import healthRouter from './routes/health.routes.js';
import authRouter from './routes/auth.routes.js';
import paymentRouter from './routes/payment.routes.js';

const app = express();

// ==============================================================================
// GLOBAL MIDDLEWARES
// ==============================================================================

// 1. Security Headers: helmet helps secure Express apps by setting various HTTP headers
app.use(helmet());

// 2. CORS: Cross-Origin Resource Sharing allows requests from frontends hosted on other domains
app.use(cors());

// 3. Request Logging: Morgan tracks request status, duration, and payloads in development
app.use(requestLogger);

// 4. JSON Body Parser: parses incoming requests with JSON payloads (required for M-Pesa APIs)
app.use(express.json());

// 5. URL-encoded Body Parser: parses incoming requests with URL-encoded payloads
app.use(express.urlencoded({ extended: true }));

// ==============================================================================
// SWAGGER INTERACTIVE DOCUMENTATION
// ==============================================================================
// Serve Swagger documentation UI at the /docs path
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ==============================================================================
// ROUTE REGISTRATIONS
// ==============================================================================
// Route definitions are structured under the specified API version prefix (default: /api)
app.use(`${config.apiPrefix}/health`, healthRouter);
app.use(`${config.apiPrefix}/auth`, authRouter);
app.use(`${config.apiPrefix}/payments`, paymentRouter);

// Root route redirects to Swagger documentation for better developer experience
app.get('/', (req, res) => {
  res.redirect('/docs');
});

// ==============================================================================
// ERROR HANDLING MIDDLEWARES
// ==============================================================================

// 1. Unmatched Route Handler: triggers 404 for non-existent routes
app.use(notFoundHandler);

// 2. Centralized Global Error Handler: formats and returns final error responses
app.use(errorHandler);

export default app;
