const Post = require('../models/Post');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { normalizeUploadedFile, cloudinary, usingCloudinary } = require('../utils/upload');
const { createNotification } = require('../utils/notifications');

function extractHashtags(caption = '') {
  const matches = caption.match(/#[\w]+/g) || [];
  return [...new Set(matches.map((h) => h.slice(1).toLowerCase()))];
}

async function extractMentions(caption = '') {
  const matches = caption.match(/@[\w.]+/g) || [];
  const usernames = [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
  if (!usernames.length) return [];
  const users = await User.find({ username: { $in: usernames } }).select('_id');
  return users.map((u) => u._id);
}

// ---------------- CREATE ----------------
exports.createPost = catchAsync(async (req, res, next) => {
  const { caption = '', taggedUsers = [], locationLabel, longitude, latitude, postType } = req.body;

  if ((!req.files || req.files.length === 0) && !caption.trim()) {
    return next(new ApiError(400, 'A post needs media or a caption.'));
  }

  const media = (req.files || []).map((f) => {
    const n = normalizeUploadedFile(f);
    return { url: n.url, publicId: n.publicId, type: n.type };
  });

  const hashtags = extractHashtags(caption);
  const mentions = await extractMentions(caption);

  const post = await Post.create({
    author: req.user._id,
    caption,
    media,
    postType: postType === 'reel' ? 'reel' : 'post',
    hashtags,
    mentions,
    taggedUsers: Array.isArray(taggedUsers) ? taggedUsers : [],
    location:
      longitude !== undefined && latitude !== undefined && longitude !== '' && latitude !== ''
        ? { type: 'Point', coordinates: [Number(longitude), Number(latitude)], label: locationLabel || '' }
        : undefined,
  });

  await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: 1 } });

  const populated = await post.populate('author', 'username displayName profilePicture isVerified');
  res.status(201).json({ success: true, post: populated });
});

// ---------------- FEED ----------------
exports.getFeed = catchAsync(async (req, res, next) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const sort = req.query.sort === 'recent' ? { createdAt: -1 } : { createdAt: -1 }; // algorithmic ranking placeholder -> recency for now

  const followingIds = req.user.following || [];
  const authorFilter =
    req.query.scope === 'following' ? { author: { $in: [...followingIds, req.user._id] } } : {};

  const posts = await Post.find({
    ...authorFilter,
    isArchived: false,
    isRemoved: false,
    hiddenBy: { $ne: req.user._id },
    notInterestedBy: { $ne: req.user._id },
  })
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('author', 'username displayName profilePicture isVerified')
    .populate('mentions', 'username')
    .populate('comments.user', 'username displayName profilePicture');

  const decoratedPosts = posts.map((post) => {
    const item = post.toObject();
    item._liked = item.likes.some((id) => String(id) === String(req.user._id));
    item._saved = item.savedBy.some((id) => String(id) === String(req.user._id));
    return item;
  });
  res.status(200).json({ success: true, page, count: decoratedPosts.length, posts: decoratedPosts });
});

exports.getTrending = catchAsync(async (req, res, next) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const posts = await Post.aggregate([
    { $match: { createdAt: { $gte: since }, isRemoved: false, isArchived: false } },
    {
      $addFields: {
        score: {
          $add: [{ $size: '$likes' }, { $multiply: [{ $size: '$comments' }, 2] }, { $ifNull: ['$views', 0] }],
        },
      },
    },
    { $sort: { score: -1 } },
    { $limit: 30 },
  ]);
  await Post.populate(posts, { path: 'author', select: 'username displayName profilePicture isVerified' });
  const followingIds = req.user?.following?.map((id) => String(id)) || [];
  const followerIds = req.user?.followers?.map((id) => String(id)) || [];
  const decoratedPosts = posts.map((post) => {
    if (post.author) {
      post.author.isFollowing = followingIds.includes(String(post.author._id));
      post.author.isFollowedBack = followerIds.includes(String(post.author._id));
    }
    return post;
  });
  res.status(200).json({ success: true, posts: decoratedPosts });
});

// ---------------- SINGLE POST ----------------
exports.getPost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.postId)
    .populate('author', 'username displayName profilePicture isVerified')
    .populate('comments.user', 'username displayName profilePicture')
    .populate('comments.replies.user', 'username displayName profilePicture');

  if (!post || post.isRemoved) return next(new ApiError(404, 'Post not found.'));

  post.views += 1;
  await post.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, post });
});

// ---------------- UPDATE / DELETE ----------------
exports.updatePost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.postId);
  if (!post) return next(new ApiError(404, 'Post not found.'));
  if (!post.author.equals(req.user._id)) return next(new ApiError(403, 'You can only edit your own posts.'));

  if (req.body.caption !== undefined) {
    post.caption = req.body.caption;
    post.hashtags = extractHashtags(req.body.caption);
    post.mentions = await extractMentions(req.body.caption);
    post.isEdited = true;
  }
  await post.save();

  res.status(200).json({ success: true, post });
});

exports.deletePost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.postId);
  if (!post) return next(new ApiError(404, 'Post not found.'));
  if (!post.author.equals(req.user._id) && req.user.role === 'user') {
    return next(new ApiError(403, 'You can only delete your own posts.'));
  }

  if (usingCloudinary) {
    await Promise.all(
      post.media.filter((m) => m.publicId).map((m) => cloudinary.uploader.destroy(m.publicId).catch(() => {}))
    );
  }

  await post.deleteOne();
  await User.findByIdAndUpdate(post.author, { $inc: { postsCount: -1 } });

  res.status(200).json({ success: true, message: 'Post deleted.' });
});

exports.archivePost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.postId);
  if (!post) return next(new ApiError(404, 'Post not found.'));
  if (!post.author.equals(req.user._id)) return next(new ApiError(403, 'Not your post.'));
  post.isArchived = !post.isArchived;
  await post.save();
  res.status(200).json({ success: true, isArchived: post.isArchived });
});

exports.pinPost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.postId);
  if (!post) return next(new ApiError(404, 'Post not found.'));
  if (!post.author.equals(req.user._id)) return next(new ApiError(403, 'Not your post.'));
  post.isPinned = !post.isPinned;
  await post.save();
  res.status(200).json({ success: true, isPinned: post.isPinned });
});

// ---------------- ENGAGEMENT ----------------
exports.toggleLike = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.postId);
  if (!post) return next(new ApiError(404, 'Post not found.'));

  const alreadyLiked = post.likes.some((id) => id.equals(req.user._id));
  if (alreadyLiked) {
    post.likes = post.likes.filter((id) => !id.equals(req.user._id));
  } else {
    post.likes.push(req.user._id);
    const recipient = await User.findById(post.author).select('username');
    await createNotification({
      type: 'like', actor: req.user, recipient, post: post._id,
      message: `${req.user.username} liked your post.`,
    });
  }
  await post.save();

  res.status(200).json({ success: true, liked: !alreadyLiked, likesCount: post.likes.length });
});

exports.addComment = catchAsync(async (req, res, next) => {
  const { text } = req.body;
  if (!text?.trim()) return next(new ApiError(400, 'Comment text is required.'));

  const post = await Post.findById(req.params.postId);
  if (!post) return next(new ApiError(404, 'Post not found.'));

  post.comments.push({ user: req.user._id, text: text.trim() });
  await post.save();

  const recipient = await User.findById(post.author).select('username');
  await createNotification({
    type: 'comment', actor: req.user, recipient, post: post._id,
    message: `${req.user.username} commented on your post.`,
  });

  const populated = await post.populate('comments.user', 'username displayName profilePicture');
  res.status(201).json({ success: true, comment: populated.comments[populated.comments.length - 1] });
});

exports.addReply = catchAsync(async (req, res, next) => {
  const { text } = req.body;
  if (!text?.trim()) return next(new ApiError(400, 'Reply text is required.'));

  const post = await Post.findById(req.params.postId);
  if (!post) return next(new ApiError(404, 'Post not found.'));

  const comment = post.comments.id(req.params.commentId);
  if (!comment) return next(new ApiError(404, 'Comment not found.'));

  comment.replies.push({ user: req.user._id, text: text.trim() });
  await post.save();

  const recipient = await User.findById(comment.user).select('username');
  await createNotification({
    type: 'reply', actor: req.user, recipient, post: post._id,
    message: `${req.user.username} replied to your comment.`,
  });

  res.status(201).json({ success: true, replies: comment.replies });
});

exports.toggleSave = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.postId);
  if (!post) return next(new ApiError(404, 'Post not found.'));

  const alreadySaved = post.savedBy.some((id) => id.equals(req.user._id));
  if (alreadySaved) {
    post.savedBy = post.savedBy.filter((id) => !id.equals(req.user._id));
  } else {
    post.savedBy.push(req.user._id);
  }
  await post.save();

  res.status(200).json({ success: true, saved: !alreadySaved });
});

exports.sharePost = catchAsync(async (req, res, next) => {
  const post = await Post.findByIdAndUpdate(req.params.postId, { $inc: { shares: 1 } }, { new: true });
  if (!post) return next(new ApiError(404, 'Post not found.'));
  res.status(200).json({ success: true, shares: post.shares });
});

exports.reportPost = catchAsync(async (req, res, next) => {
  const { reason, details } = req.body;
  const post = await Post.findById(req.params.postId);
  if (!post) return next(new ApiError(404, 'Post not found.'));

  post.reports.push({ user: req.user._id, reason, details });
  await post.save();

  res.status(200).json({ success: true, message: 'Post reported. Thank you.' });
});

exports.hidePost = catchAsync(async (req, res, next) => {
  const post = await Post.findByIdAndUpdate(req.params.postId, { $addToSet: { hiddenBy: req.user._id } });
  if (!post) return next(new ApiError(404, 'Post not found.'));
  res.status(200).json({ success: true, message: 'Post hidden from your feed.' });
});

exports.unhidePost = catchAsync(async (req, res, next) => {
  const post = await Post.findByIdAndUpdate(req.params.postId, { $pull: { hiddenBy: req.user._id } });
  if (!post) return next(new ApiError(404, 'Post not found.'));
  res.status(200).json({ success: true, message: 'Post restored to your feed.' });
});

exports.notInterested = catchAsync(async (req, res, next) => {
  const post = await Post.findByIdAndUpdate(req.params.postId, { $addToSet: { notInterestedBy: req.user._id } });
  if (!post) return next(new ApiError(404, 'Post not found.'));
  res.status(200).json({ success: true, message: 'Got it, showing fewer posts like this.' });
});

exports.interested = catchAsync(async (req, res, next) => {
  const post = await Post.findByIdAndUpdate(
    req.params.postId,
    { $pull: { notInterestedBy: req.user._id } },
    { new: true }
  );
  if (!post) return next(new ApiError(404, 'Post not found.'));
  res.status(200).json({ success: true, message: 'We’ll show you more posts like this.' });
});

exports.getSavedPosts = catchAsync(async (req, res, next) => {
  const posts = await Post.find({ savedBy: req.user._id })
    .sort({ createdAt: -1 })
    .populate('author', 'username displayName profilePicture isVerified');
  const decoratedPosts = posts.map((post) => ({ ...post.toObject(), _saved: true }));
  res.status(200).json({ success: true, posts: decoratedPosts });
});

exports.getUserPosts = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!user) return next(new ApiError(404, 'User not found.'));

  const posts = await Post.find({ author: user._id, isArchived: false, isRemoved: false })
    .sort({ isPinned: -1, createdAt: -1 })
    .populate('author', 'username displayName profilePicture isVerified');

  res.status(200).json({ success: true, posts });
});
