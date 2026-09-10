const { validationResult } = require('express-validator');

/**
 * asyncHandler — eliminates try/catch boilerplate in route handlers.
 * Wraps any async function and forwards errors to Express error handler.
 */
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * validate — runs express-validator checks and returns 422 if any fail.
 * Usage: router.post('/path', [...rules], validate, handler)
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error:   'Validation failed',
      details: errors.array().map(e => ({ field: e.path, msg: e.msg })),
    });
  }
  next();
};

/**
 * notFound — 404 handler (mount after all routes)
 */
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error:   `Route ${req.method} ${req.originalUrl} not found`,
  });
};

/**
 * errorHandler — global error handler (mount last)
 * Handles Mongoose errors, JWT errors, and generic errors uniformly.
 */
const errorHandler = (err, req, res, _next) => {
  // Log in dev
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${err.name}: ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
  }

  let status  = err.statusCode || err.status || 500;
  let message = err.message    || 'Internal server error';

  // ── Mongoose: duplicate key (e.g. email already exists) ───
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    status  = 409;
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }

  // ── Mongoose: CastError (invalid ObjectId) ────────────────
  if (err.name === 'CastError') {
    status  = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // ── Mongoose: ValidationError ─────────────────────────────
  if (err.name === 'ValidationError') {
    status  = 422;
    message = Object.values(err.errors).map(e => e.message).join('. ');
  }

  // ── JWT errors (shouldn't reach here normally, but safety) ─
  if (err.name === 'JsonWebTokenError') {
    status  = 401;
    message = 'Invalid token';
  }

  res.status(status).json({
    success: false,
    error:   message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = { asyncHandler, validate, notFound, errorHandler };
