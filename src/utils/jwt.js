const jwt = require('jsonwebtoken');

const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
  });
};

const setAuthCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('access_token', token, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: 1 * 60 * 60 * 1000, // 1 hr
  });
};

const clearAuthCookie = (res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('access_token', {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  });
};

module.exports = { signToken, setAuthCookie, clearAuthCookie };
