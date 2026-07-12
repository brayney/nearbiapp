const express = require('express');
const { protect } = require('../middleware/auth');
const { upload } = require('../utils/upload');
const storyController = require('../controllers/storyController');

const router = express.Router();
router.use(protect);
router.get('/', storyController.getStories);
router.post('/', upload.single('media'), storyController.createStory);
router.get('/:storyId', storyController.viewStory);
router.delete('/:storyId', storyController.deleteStory);

module.exports = router;
