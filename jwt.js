const jwt = require('jsonwebtoken');

/**
 * signToken — creates a signed JWT access token
 */
const signToken = (userId) =>
  jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

/**
 * signRefreshToken — long-lived token for silent re-auth
 */
const signRefreshToken = (userId) =>
  jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

/**
 * sendToken — standard auth response helper
 * Sends accessToken + refreshToken + user object
 */
const sendToken = (res, user, statusCode = 200) => {
  const accessToken  = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  res.status(statusCode).json({
    success:      true,
    accessToken,
    refreshToken,
    expiresIn:    process.env.JWT_EXPIRES_IN || '7d',
    user: {
      id:       user._id,
      name:     user.name,
      email:    user.email,
      photoURL: user.photoURL,
      provider: user.provider,
      college:  user.college,
      branch:   user.branch,
      bio:      user.bio,
    },
  });
};

/**
 * successResponse — standard 2xx wrapper
 */
const successResponse = (res, data, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, ...data });

/**
 * paginatedResponse — wraps list results with pagination meta
 */
const paginatedResponse = (res, { data, total, page, limit }) =>
  res.status(200).json({
    success: true,
    count:   data.length,
    total,
    page,
    pages:   Math.ceil(total / limit),
    data,
  });

module.exports = { signToken, signRefreshToken, sendToken, successResponse, paginatedResponse };
