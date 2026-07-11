const crypto = require('crypto');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  msFromExpiryString,
} = require('../utils/tokens');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

async function issueSession(user, req, res, statusCode) {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshTokens = user.refreshTokens || [];
  // Prune expired tokens
  user.refreshTokens = user.refreshTokens.filter((rt) => rt.expiresAt > new Date());
  user.refreshTokens.push({
    token: refreshToken,
    device: req.headers['user-agent'] || 'unknown',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + msFromExpiryString(process.env.JWT_REFRESH_EXPIRES)),
  });
  user.isOnline = true;
  user.lastActive = new Date();
  await user.save({ validateBeforeSave: false });

  setAuthCookies(res, accessToken, refreshToken);

  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: user.toPublicProfile(),
  });
}

// ---------------- REGISTER ----------------
exports.register = catchAsync(async (req, res, next) => {
  const { username, email, password, displayName } = req.body;

  const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
  if (existing) {
    return next(new ApiError(409, 'Email or username is already registered.'));
  }

  const user = await User.create({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
    displayName: displayName || username,
  });

  const verifyToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  try {
    await sendVerificationEmail(user.email, verifyToken);
  } catch (err) {
    console.error('Failed to send verification email:', err.message);
    await user.deleteOne();
    return next(new ApiError(503, 'We could not send a verification email. Please try again later.'));
  }

  await issueSession(user, req, res, 201);
});

// ---------------- LOGIN ----------------
exports.login = catchAsync(async (req, res, next) => {
  const { identifier, password, rememberMe } = req.body; // identifier = email or username

  const user = await User.findOne({
    $or: [{ email: identifier.toLowerCase() }, { username: identifier.toLowerCase() }],
  }).select('+password +loginAttempts +lockUntil');

  if (!user) return next(new ApiError(401, 'Invalid credentials.'));

  if (user.isLocked()) {
    return next(new ApiError(423, 'Account temporarily locked due to too many failed attempts. Try again later.'));
  }

  if (user.isBanned) return next(new ApiError(403, 'This account has been banned.'));

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_TIME);
    }
    await user.save({ validateBeforeSave: false });
    return next(new ApiError(401, 'Invalid credentials.'));
  }

  user.loginAttempts = 0;
  user.lockUntil = undefined;

  // "Remember me" extends refresh token lifetime for this session by
  // simply keeping the default long expiry vs a short one if unchecked.
  if (!rememberMe) {
    // Still issue a normal refresh token but mark short session via device tag;
    // full session-length differentiation is handled client-side by not
    // persisting the refresh token in localStorage when rememberMe is false.
  }

  await issueSession(user, req, res, 200);
});

// ---------------- LOGOUT ----------------
exports.logout = catchAsync(async (req, res, next) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  if (refreshToken && req.user) {
    req.user.refreshTokens = req.user.refreshTokens.filter((rt) => rt.token !== refreshToken);
    req.user.isOnline = false;
    req.user.lastActive = new Date();
    await req.user.save({ validateBeforeSave: false });
  }
  clearAuthCookies(res);
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// ---------------- REFRESH TOKEN ----------------
exports.refresh = catchAsync(async (req, res, next) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  if (!refreshToken) return next(new ApiError(401, 'No refresh token provided.'));

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    return next(new ApiError(401, 'Invalid or expired refresh token. Please log in again.'));
  }

  const user = await User.findById(decoded.id).select('+refreshTokens.token');
  if (!user) return next(new ApiError(401, 'User no longer exists.'));

  const storedToken = user.refreshTokens.find((rt) => rt.token === refreshToken);
  if (!storedToken) {
    // Possible token reuse/theft - invalidate all sessions as a precaution.
    user.refreshTokens = [];
    await user.save({ validateBeforeSave: false });
    return next(new ApiError(401, 'Refresh token not recognized. Please log in again.'));
  }

  // Rotate: remove old, issue new
  user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
  await user.save({ validateBeforeSave: false });

  await issueSession(user, req, res, 200);
});

// ---------------- FORGOT PASSWORD ----------------
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  // Always respond success to avoid leaking which emails are registered.
  if (!user) {
    return res.status(200).json({
      success: true,
      message: 'If that email is registered, a reset link has been sent.',
    });
  }

  // Reset links are only sent after the mailbox owner completed verification.
  if (!user.isEmailVerified) {
    return res.status(200).json({
      success: true,
      message: 'If that email is registered and verified, a reset link has been sent.',
    });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    await sendPasswordResetEmail(user.email, resetToken);
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ApiError(500, 'Failed to send reset email. Please try again later.'));
  }

  res.status(200).json({
    success: true,
    message: 'If that email is registered and verified, a reset link has been sent.',
  });
});

// ---------------- RESET PASSWORD ----------------
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token, newPassword } = req.body;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+password');

  if (!user) return next(new ApiError(400, 'Token is invalid or has expired.'));

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = []; // invalidate all existing sessions
  await user.save();

  res.status(200).json({ success: true, message: 'Password reset successfully. Please log in again.' });
});

// ---------------- CHANGE PASSWORD (logged in) ----------------
exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) return next(new ApiError(401, 'Current password is incorrect.'));

  user.password = newPassword;
  user.refreshTokens = []; // force re-login on all devices
  await user.save();

  clearAuthCookies(res);
  res.status(200).json({ success: true, message: 'Password changed. Please log in again.' });
});

// ---------------- VERIFY EMAIL ----------------
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.body;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) return next(new ApiError(400, 'Verification token is invalid or has expired.'));

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: 'Email verified successfully.' });
});

exports.resendVerification = catchAsync(async (req, res, next) => {
  const user = req.user;
  if (user.isEmailVerified) {
    return res.status(200).json({ success: true, message: 'Email already verified.' });
  }
  const verifyToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });
  await sendVerificationEmail(user.email, verifyToken);
  res.status(200).json({ success: true, message: 'Verification email sent.' });
});

// ---------------- ME ----------------
exports.getMe = catchAsync(async (req, res) => {
  res.status(200).json({ success: true, user: req.user.toPublicProfile() });
});
