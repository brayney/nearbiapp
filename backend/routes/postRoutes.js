const express = require('express');
const { body } = require('express-validator');
const postController = require('../controllers/postController');
const { protect } = require('../middleware/auth');
const { upload } = require('../utils/upload');
const { uploadLimiter } = require('../middleware/security');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(protect); // every post route requires auth in this scaffold

router.get('/feed', postController.getFeed);
router.get('/trending', postController.getTrending);
router.get('/saved', postController.getSavedPosts);
router.get('/user/:username', postController.getUserPosts);

router.post('/', uploadLimiter, upload.array('media', 10), postController.createPost);

router.get('/:postId', postController.getPost);
router.patch('/:postId', postController.updatePost);
router.delete('/:postId', postController.deletePost);
router.patch('/:postId/archive', postController.archivePost);
router.patch('/:postId/pin', postController.pinPost);

router.post('/:postId/like', postController.toggleLike);
router.post('/:postId/save', postController.toggleSave);
router.post('/:postId/share', postController.sharePost);
router.post('/:postId/hide', postController.hidePost);
router.post('/:postId/unhide', postController.unhidePost);
router.post('/:postId/not-interested', postController.notInterested);
router.post('/:postId/interested', postController.interested);

router.post(
  '/:postId/comments',
  [body('text').trim().notEmpty().withMessage('Comment text is required')],
  validate,
  postController.addComment
);
router.post(
  '/:postId/comments/:commentId/replies',
  [body('text').trim().notEmpty().withMessage('Reply text is required')],
  validate,
  postController.addReply
);

router.post(
  '/:postId/report',
  [
    body('reason')
      .isIn(['spam', 'nudity', 'violence', 'hate_speech', 'misinformation', 'other'])
      .withMessage('Invalid report reason'),
  ],
  validate,
  postController.reportPost
);

module.exports = router;
