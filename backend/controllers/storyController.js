const Story = require('../models/Story');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { normalizeUploadedFile, cloudinary, usingCloudinary } = require('../utils/upload');

function canViewStory(story, viewer) {
  if (String(story.author._id) === String(viewer._id)) return true;
  const audience = story.author.privacySettings?.whoCanSeeStories || 'followers';
  if (audience === 'everyone') return true;
  if (audience === 'followers') return story.author.followers.some((id) => id.equals(viewer._id));
  return false;
}

exports.getStories = catchAsync(async (req, res) => {
  const stories = await Story.find({ expiresAt: { $gt: new Date() } })
    .sort({ createdAt: -1 })
    .populate('author', 'username displayName profilePicture isVerified privacySettings followers');

  const visibleStories = stories.filter((story) => canViewStory(story, req.user));
  res.status(200).json({ success: true, stories: visibleStories });
});

exports.createStory = catchAsync(async (req, res, next) => {
  const text = req.body.text?.trim() || '';
  if (!text && !req.file) return next(new ApiError(400, 'Add text, an image, or a video to your story.'));
  if (text.length > 280) return next(new ApiError(400, 'Stories cannot exceed 280 characters.'));

  const uploaded = req.file ? normalizeUploadedFile(req.file) : null;
  const story = await Story.create({
    author: req.user._id,
    text,
    media: uploaded ? { url: uploaded.url, publicId: uploaded.publicId, type: uploaded.type } : undefined,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  await story.populate('author', 'username displayName profilePicture isVerified');
  res.status(201).json({ success: true, story });
});

exports.viewStory = catchAsync(async (req, res, next) => {
  const story = await Story.findOne({ _id: req.params.storyId, expiresAt: { $gt: new Date() } })
    .populate('author', 'username displayName profilePicture isVerified privacySettings followers');
  if (!story) return next(new ApiError(404, 'Story not found or expired.'));
  if (!canViewStory(story, req.user)) return next(new ApiError(403, 'You cannot view this story.'));

  if (String(story.author._id) !== String(req.user._id)) {
    await Story.updateOne({ _id: story._id }, { $addToSet: { viewers: req.user._id } });
  }
  res.status(200).json({ success: true, story });
});

exports.deleteStory = catchAsync(async (req, res, next) => {
  const story = await Story.findById(req.params.storyId);
  if (!story) return next(new ApiError(404, 'Story not found.'));
  if (!story.author.equals(req.user._id)) return next(new ApiError(403, 'You can only delete your own stories.'));
  if (usingCloudinary && story.media?.publicId) await cloudinary.uploader.destroy(story.media.publicId).catch(() => {});
  await story.deleteOne();
  res.status(200).json({ success: true });
});
