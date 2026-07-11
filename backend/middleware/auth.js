const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { verifyAccessToken } = require('../utils/tokens');
const User = require('../models/User');

const protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(401, 'You are not logged in. Please log in to continue.'));
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    return next(new ApiError(401, 'Invalid or expired session. Please log in again.'));
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new ApiError(401, 'The user belonging to this token no longer exists.'));
  }

  if (user.isBanned) {
    return next(new ApiError(403, 'This account has been banned.'));
  }
  if (user.isSuspended && (!user.suspendedUntil || user.suspendedUntil > new Date())) {
    return next(new ApiError(403, 'This account is currently suspended.'));
  }

  if (user.changedPasswordAfter(decoded.iat)) {
    return next(new ApiError(401, 'Password was recently changed. Please log in again.'));
  }

  req.user = user;
  next();
});

// Attaches req.user if a valid token is present, but does NOT reject the
// request otherwise. Useful for endpoints that behave differently for
// logged-in vs anonymous users (e.g. public profile views).
const optionalAuth = catchAsync(async (req, res, next) => {
  let token;
  if (req.cookies?.accessToken) token = req.cookies.accessToken;
  else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return next();

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);
    if (user && !user.isBanned) req.user = user;
  } catch (err) {
    // silent - just proceed unauthenticated
  }
  next();
});

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }
    next();
  };
};

module.exports = { protect, optionalAuth, restrictTo };
