/**
 * 404 NOT FOUND MIDDLEWARE
 * 
 * WHY IT EXISTS:
 * When a client calls a URL or HTTP method that does not exist in our route declarations,
 * Express by default returns an HTML error page. This middleware catches those requests 
 * and returns a clean, standardized JSON 404 response.
 * 
 * WHAT IT DOES:
 * - Intercepts unmatched requests.
 * - Creates a 404 error object and forwards it to the global error handler.
 * 
 * WHEN IT SHOULD BE USED:
 * Registered in app.js after all route definitions, but before the global error handler.
 */

export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Resource Not Found - ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error); // Forward to the global error handler middleware
};

export default notFoundHandler;
