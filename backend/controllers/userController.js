const User = require('../models/User');
const Post = require('../models/Post');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { normalizeUploadedFile, cloudinary, usingCloudinary } = require('../utils/upload');
const { buildFollowNotification } = require('../utils/notifications');

exports.getProfile = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() });
  if (!user) return next(new ApiError(404, 'User not found.'));

  const isOwner = req.user && req.user._id.equals(user._id);
  const isFollowing = req.user ? user.followers.some((f) => f.equals(req.user._id)) : false;
  const followsYou = req.user ? user.following.some((f) => f.equals(req.user._id)) : false;

  // Respect private accounts: hide posts/detail from non-followers.
  const isPrivate = user.privacySettings.accountPrivacy === 'private';
  const canViewFull = isOwner || isFollowing || !isPrivate;

  res.status(200).json({
    success: true,
    user: user.toPublicProfile(),
    isFollowing,
    followsYou,
    isOwner,
    canViewFull,
  });
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  const allowedFields = [
    'displayName',
    'bio',
    'gender',
    'birthday',
    'locationLabel',
    'interests',
  ];
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, user: user.toPublicProfile() });
});

exports.updatePrivacySettings = catchAsync(async (req, res, next) => {
  const allowed = ['accountPrivacy', 'locationSharing', 'locationVisibility', 'whoCanMessage', 'whoCanSeeStories'];
  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[`privacySettings.${field}`] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
  res.status(200).json({ success: true, privacySettings: user.privacySettings });
});

exports.getPrivacySettings = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('privacySettings');
  res.status(200).json({ success: true, privacySettings: user.privacySettings });
});

exports.updateNote = catchAsync(async (req, res, next) => {
  const text = req.body.text?.trim() || '';
  if (text.length > 60) return next(new ApiError(400, 'Notes cannot exceed 60 characters.'));

  const note = text ? { text, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } : { text: '', expiresAt: null };
  const user = await User.findByIdAndUpdate(req.user._id, { note }, { new: true });
  res.status(200).json({ success: true, note: user.note });
});

exports.uploadAvatar = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new ApiError(400, 'No file uploaded.'));

  const user = await User.findById(req.user._id);

  // Clean up old avatar if using Cloudinary
  if (usingCloudinary && user.profilePicture?.publicId) {
    await cloudinary.uploader.destroy(user.profilePicture.publicId).catch(() => {});
  }

  const file = normalizeUploadedFile(req.file);
  user.profilePicture = { url: file.url, publicId: file.publicId };
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, profilePicture: user.profilePicture });
});

exports.uploadCoverPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new ApiError(400, 'No file uploaded.'));

  const user = await User.findById(req.user._id);
  if (usingCloudinary && user.coverPhoto?.publicId) {
    await cloudinary.uploader.destroy(user.coverPhoto.publicId).catch(() => {});
  }

  const file = normalizeUploadedFile(req.file);
  user.coverPhoto = { url: file.url, publicId: file.publicId };
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, coverPhoto: user.coverPhoto });
});

exports.followUser = catchAsync(async (req, res, next) => {
  const targetId = req.params.userId;
  if (targetId === String(req.user._id)) {
    return next(new ApiError(400, 'You cannot follow yourself.'));
  }

  const target = await User.findById(targetId);
  if (!target) return next(new ApiError(404, 'User not found.'));

  const alreadyFollowing = target.followers.some((f) => f.equals(req.user._id));
  if (alreadyFollowing) return next(new ApiError(409, 'Already following this user.'));

  target.followers.push(req.user._id);
  target.followersCount = target.followers.length;
  req.user.following.push(target._id);
  req.user.followingCount = req.user.following.length;

  await target.save({ validateBeforeSave: false });
  await req.user.save({ validateBeforeSave: false });

  const notification = buildFollowNotification(req.user, target);
  await User.findByIdAndUpdate(target._id, { $push: { notifications: notification } });

  res.status(200).json({ success: true, message: `You are now following ${target.username}.` });
});

exports.unfollowUser = catchAsync(async (req, res, next) => {
  const targetId = req.params.userId;
  const target = await User.findById(targetId);
  if (!target) return next(new ApiError(404, 'User not found.'));

  target.followers = target.followers.filter((f) => !f.equals(req.user._id));
  target.followersCount = target.followers.length;
  req.user.following = req.user.following.filter((f) => !f.equals(target._id));
  req.user.followingCount = req.user.following.length;

  await target.save({ validateBeforeSave: false });
  await req.user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: `Unfollowed ${target.username}.` });
});

exports.getFollowers = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() }).populate(
    'followers',
    'username displayName profilePicture isVerified'
  );
  if (!user) return next(new ApiError(404, 'User not found.'));
  res.status(200).json({ success: true, followers: user.followers });
});

exports.getFollowing = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() }).populate(
    'following',
    'username displayName profilePicture isVerified'
  );
  if (!user) return next(new ApiError(404, 'User not found.'));
  res.status(200).json({ success: true, following: user.following });
});

exports.searchUsers = catchAsync(async (req, res, next) => {
  const { q } = req.query;
  if (!q || q.trim().length < 1) {
    return res.status(200).json({ success: true, users: [] });
  }
  const users = await User.find({
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { displayName: { $regex: q, $options: 'i' } },
    ],
  })
    .limit(20)
    .select('username displayName profilePicture isVerified followersCount');

  res.status(200).json({ success: true, users });
});

// ---------------- LOCATION ----------------
exports.updateLocation = catchAsync(async (req, res, next) => {
  const { longitude, latitude } = req.body;
  if (typeof longitude !== 'number' || typeof latitude !== 'number') {
    return next(new ApiError(400, 'longitude and latitude (numbers) are required.'));
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      location: { type: 'Point', coordinates: [longitude, latitude], updatedAt: new Date() },
    },
    { new: true }
  );

  res.status(200).json({ success: true, location: user.location });
});

exports.getNearbyUsers = catchAsync(async (req, res, next) => {
  const radiusKm = Math.min(Number(req.query.radiusKm) || 5, 200);
  const user = req.user;

  if (!user.location || (user.location.coordinates[0] === 0 && user.location.coordinates[1] === 0)) {
    return next(new ApiError(400, 'Your location is not set yet.'));
  }

  const nearbyCandidates = await User.find({
    _id: { $ne: user._id },
    'privacySettings.locationSharing': { $ne: 'hidden' },
    'privacySettings.locationVisibility': { $ne: 'nobody' },
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: user.location.coordinates },
        $maxDistance: radiusKm * 1000,
      },
    },
  })
    .limit(50)
    .select('username displayName profilePicture location locationLabel isVerified isOnline privacySettings followers following');

  // Enforce each account's audience choice after the geographic query.
  const nearby = nearbyCandidates.filter((candidate) => {
    const visibility = candidate.privacySettings.locationVisibility;
    if (visibility === 'everyone') return true;
    const viewerFollowsCandidate = candidate.followers.some((id) => id.equals(user._id));
    if (visibility === 'followers') return viewerFollowsCandidate;
    if (visibility === 'friends') return viewerFollowsCandidate && candidate.following.some((id) => id.equals(user._id));
    return false;
  }).map((candidate) => candidate.toObject());

  res.status(200).json({ success: true, users: nearby });
});
