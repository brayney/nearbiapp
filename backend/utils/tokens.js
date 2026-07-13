const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function generateAccessToken(userId, role) {
  return jwt.sign({ id: userId, role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES,
  });
}

function generateRefreshToken(userId) {
  return jwt.sign({ id: userId, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

function msFromExpiryString(expiryStr) {
  // supports formats like '15m', '30d', '1h'
  const match = /^(\d+)([smhd])$/.exec(expiryStr);
  if (!match) return 15 * 60 * 1000;
  const num = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return num * multipliers[unit];
}

function setAuthCookies(res, accessToken, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'none',
    path: '/api',
  };

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: msFromExpiryString(process.env.JWT_ACCESS_EXPIRES),
  });
  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: msFromExpiryString(process.env.JWT_REFRESH_EXPIRES),
  });
}

function clearAuthCookies(res) {
  const clearOptions = { path: '/api', sameSite: 'none' };
  res.clearCookie('accessToken', clearOptions);
  res.clearCookie('refreshToken', clearOptions);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  msFromExpiryString,
};
