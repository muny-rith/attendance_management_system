/**
 * Global Error Handling Middleware
 */
const errorMiddleware = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.url}:`, err.message);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
};

module.exports = errorMiddleware;
