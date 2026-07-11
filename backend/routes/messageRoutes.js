const express = require('express');
const { protect } = require('../middleware/auth');
const messageController = require('../controllers/messageController');
const { upload } = require('../utils/upload');

const router = express.Router();
router.use(protect);

router.get('/conversations', messageController.getConversations);
router.get('/:userId', messageController.getConversation);
router.post('/:userId', upload.single('media'), messageController.sendMessage);
router.post('/:conversationId/read', messageController.markRead);

module.exports = router;
