const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be 3-30 characters')
      .matches(/^[a-zA-Z0-9._]+$/)
      .withMessage('Username can only contain letters, numbers, dots, underscores'),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/\d/)
      .withMessage('Password must contain a number'),
    body('birthday').isISO8601({ strict: true }).withMessage('Valid birth date required'),
    body('gender').isIn(['male', 'female', 'other', 'prefer_not_to_say']).withMessage('Valid gender required'),
    body('nationality').trim().isLength({ min: 2, max: 60 }).withMessage('Nationality is required'),
    body('favoritePet').trim().isLength({ min: 2, max: 80 }).withMessage('Favorite pet is required for account recovery'),
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  authLimiter,
  [
    body('identifier').notEmpty().withMessage('Email or username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

router.post('/logout', protect, authController.logout);
router.post('/refresh', authController.refresh);

router.post(
  '/forgot-password',
  authLimiter,
  [
    body('birthday').isISO8601({ strict: true }).withMessage('Valid birth date required'),
    body('favoritePet').trim().isLength({ min: 2, max: 80 }).withMessage('Favorite pet is required'),
  ],
  validate,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').notEmpty(),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  authController.resetPassword
);

router.post(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  authController.changePassword
);

router.post('/verify-email', [body('token').notEmpty()], validate, authController.verifyEmail);
router.post('/resend-verification', protect, authController.resendVerification);

router.get('/me', protect, authController.getMe);

module.exports = router;
