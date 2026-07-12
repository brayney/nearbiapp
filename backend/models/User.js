const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const privacySettingsSchema = new mongoose.Schema(
  {
    accountPrivacy: { type: String, enum: ['public', 'private'], default: 'public' },
    locationSharing: {
      type: String,
      enum: ['precise', 'approximate', 'hidden'],
      default: 'hidden',
    },
    locationVisibility: {
      type: String,
      enum: ['everyone', 'followers', 'friends', 'nobody'],
      default: 'nobody',
    },
    whoCanMessage: { type: String, enum: ['everyone', 'followers', 'nobody'], default: 'everyone' },
    whoCanSeeStories: { type: String, enum: ['everyone', 'followers', 'closeFriends'], default: 'followers' },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-zA-Z0-9._]+$/, 'Username can only contain letters, numbers, dots, underscores'],
      lowercase: true,
      index: true,
    },
    displayName: { type: String, trim: true, maxlength: 50 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
      index: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },

    profilePicture: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    coverPhoto: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },

    bio: { type: String, maxlength: 250, default: '' },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'], default: 'prefer_not_to_say' },
    birthday: { type: Date },
    nationality: { type: String, trim: true, maxlength: 60, default: '' },
    recoveryPetHash: { type: String, select: false },
    note: {
      text: { type: String, trim: true, maxlength: 60, default: '' },
      expiresAt: { type: Date, default: null },
    },
    location: locationSchema,
    locationLabel: { type: String, default: '' }, // human-readable, e.g. "Ormoc City, PH"
    interests: [{ type: String, trim: true }],

    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },

    isVerified: { type: Boolean, default: false }, // verified badge
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordChangedAt: { type: Date, select: false },

    isOnline: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now },

    role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
    isBanned: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    suspendedUntil: { type: Date },

    privacySettings: { type: privacySettingsSchema, default: () => ({}) },

    notifications: [
      {
        type: { type: String, default: 'system' },
        recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
        message: { type: String, default: '' },
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    refreshTokens: [
      {
        token: { type: String, select: false },
        device: String,
        createdAt: { type: Date, default: Date.now },
        expiresAt: Date,
      },
    ],

    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.index({ location: '2dsphere' });
userSchema.index({ username: 'text', displayName: 'text' });

// ---------- Hooks ----------
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

// ---------- Instance methods ----------
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (!this.passwordChangedAt) return false;
  const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
  return jwtTimestamp < changedTimestamp;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 min
  return resetToken;
};

userSchema.methods.createEmailVerificationToken = function () {
  const verifyToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h
  return verifyToken;
};

userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    username: this.username,
    displayName: this.displayName,
    profilePicture: this.profilePicture,
    coverPhoto: this.coverPhoto,
    bio: this.bio,
    isVerified: this.isVerified,
    isEmailVerified: this.isEmailVerified,
    followersCount: this.followers?.length ?? this.followersCount ?? 0,
    followingCount: this.following?.length ?? this.followingCount ?? 0,
    postsCount: this.postsCount,
    isOnline: this.isOnline,
    lastActive: this.lastActive,
    locationLabel: this.locationLabel,
    interests: this.interests,
    createdAt: this.createdAt,
    note: this.note?.expiresAt && this.note.expiresAt > new Date() ? this.note.text : '',
  };
};

module.exports = mongoose.model('User', userSchema);
