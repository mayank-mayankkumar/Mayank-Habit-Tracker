const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect — JWT authentication middleware
 * ────────────────────────────────────────
 * Reads Bearer token from Authorization header,
 * verifies it, attaches req.user for downstream handlers.
 */
const protect = async (req, res, next) => {
  try {
    // 1. Extract token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided. Please sign in.',
      });
    }
    const token = authHeader.split(' ')[1];

    // 2. Verify signature + expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const msg = err.name === 'TokenExpiredError'
        ? 'Token expired. Please sign in again.'
        : 'Invalid token. Please sign in.';
      return res.status(401).json({ success: false, error: msg });
    }

    // 3. Confirm user still exists (not deleted mid-session)
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or deactivated.',
      });
    }

    // 4. Attach to request
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * optionalAuth — attaches user if token present, otherwise continues
 * Used for routes that work both authenticated and anonymous.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
      } catch { /* ignore invalid token for optional auth */ }
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { protect, optionalAuth };
