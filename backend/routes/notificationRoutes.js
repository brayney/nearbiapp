const express = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  const user = await User.findById(req.user._id).populate('notifications.actor', 'username displayName profilePicture');
  const notifications = (user?.notifications || []).slice().sort((a, b) => b.createdAt - a.createdAt);

  res.status(200).json({ success: true, notifications });
});

router.patch('/:notificationId/read', async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: { 'notifications.$[elem].read': true },
  }, {
    arrayFilters: [{ 'elem._id': req.params.notificationId }],
  });

  res.status(200).json({ success: true, message: 'Notification marked as read.' });
});

router.patch('/read', async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: { 'notifications.$[].read': true },
  });

  res.status(200).json({ success: true, message: 'All notifications marked as read.' });
});

module.exports = router;
