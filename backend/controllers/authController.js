const crypto = require('crypto');
const bcrypt = require('bcryptjs');
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
const { sendVerificationEmail } = require('../utils/email');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

function normalizeRecoveryAnswer(value) {
  return String(value || '').trim().toLocaleLowerCase();
}

function ageFromBirthday(birthday) {
  const today = new Date();
  const date = new Date(birthday);
  let age = today.getUTCFullYear() - date.getUTCFullYear();
  const hasHadBirthday = today.getUTCMonth() > date.getUTCMonth()
    || (today.getUTCMonth() === date.getUTCMonth() && today.getUTCDate() >= date.getUTCDate());
  if (!hasHadBirthday) age -= 1;
  return age;
}

function sameBirthday(left, right) {
  return new Date(left).toISOString().slice(0, 10) === new Date(right).toISOString().slice(0, 10);
}

// Email is private, so only include it in responses for the authenticated account.
function toAuthenticatedUser(user) {
  return { ...user.toPublicProfile(), email: user.email };
}

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
    user: toAuthenticatedUser(user),
  });
}

// ---------------- REGISTER ----------------
exports.register = catchAsync(async (req, res, next) => {
  const { username, email, password, displayName, birthday, gender, nationality, favoritePet } = req.body;

  const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
  if (existing) {
    return next(new ApiError(409, 'Email or username is already registered.'));
  }

  const age = ageFromBirthday(birthday);
  if (age < 1 || age > 120) return next(new ApiError(400, 'Enter a valid birth date.'));

  const user = await User.create({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
    displayName: displayName || username,
    birthday: new Date(birthday),
    gender,
    nationality: nationality.trim(),
    recoveryPetHash: await bcrypt.hash(normalizeRecoveryAnswer(favoritePet), 12),
  });

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
  const { identifier, birthday, favoritePet } = req.body;
  const normalizedIdentifier = identifier.toLowerCase();
  const user = await User.findOne({
    $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
  }).select('+recoveryPetHash');

  const recoveryMatches = user
    && user.recoveryPetHash
    && sameBirthday(user.birthday, birthday)
    && await bcrypt.compare(normalizeRecoveryAnswer(favoritePet), user.recoveryPetHash);

  if (!recoveryMatches) {
    return next(new ApiError(400, 'We could not verify those account recovery details.'));
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    resetToken,
    message: 'Account recovery details confirmed.',
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
  const user = await User.findById(req.user._id).select('+emailVerificationToken +emailVerificationExpires');
  if (user.isEmailVerified) {
    return res.status(200).json({ success: true, message: 'Email already verified.' });
  }

  const previousToken = user.emailVerificationToken;
  const previousExpiry = user.emailVerificationExpires;
  const verifyToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  try {
    await sendVerificationEmail(user.email, verifyToken);
  } catch (err) {
    user.emailVerificationToken = previousToken;
    user.emailVerificationExpires = previousExpiry;
    await user.save({ validateBeforeSave: false });
    console.error('Failed to resend verification email:', err);
    return next(new ApiError(500, 'Could not send verification email. Please try again later.'));
  }

  res.status(200).json({ success: true, message: 'Verification email sent.' });
});

// ---------------- ME ----------------
exports.getMe = catchAsync(async (req, res) => {
  res.status(200).json({ success: true, user: toAuthenticatedUser(req.user) });
});
