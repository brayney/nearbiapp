const express = require('express');
const userController = require('../controllers/userController');
const { protect, optionalAuth } = require('../middleware/auth');
const { upload } = require('../utils/upload');
const { uploadLimiter } = require('../middleware/security');

const router = express.Router();

router.get('/search', protect, userController.searchUsers);
router.get('/nearby', protect, userController.getNearbyUsers);

router.patch('/me', protect, userController.updateProfile);
router.patch('/me/privacy', protect, userController.updatePrivacySettings);
router.get('/me/privacy', protect, userController.getPrivacySettings);
router.patch('/me/note', protect, userController.updateNote);
router.patch('/me/location', protect, userController.updateLocation);
router.post('/me/avatar', protect, uploadLimiter, upload.single('avatar'), userController.uploadAvatar);
router.post('/me/cover', protect, uploadLimiter, upload.single('cover'), userController.uploadCoverPhoto);

router.get('/:username', optionalAuth, userController.getProfile);
router.get('/:username/followers', userController.getFollowers);
router.get('/:username/following', userController.getFollowing);

router.post('/:userId/follow', protect, userController.followUser);
router.delete('/:userId/follow', protect, userController.unfollowUser);

module.exports = router;
