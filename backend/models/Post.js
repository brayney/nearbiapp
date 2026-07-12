const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 500 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    replies: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true, maxlength: 500 },
        likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        createdAt: { type: Date, default: Date.now },
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    type: { type: String, enum: ['image', 'video', 'gif'], required: true },
    width: Number,
    height: Number,
    duration: Number, // for video
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: undefined },
    coordinates: { type: [Number], default: undefined }, // [lng, lat]
    label: { type: String, default: '' },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    caption: { type: String, maxlength: 2200, default: '' },
    media: [mediaSchema],
    postType: { type: String, enum: ['post', 'reel'], default: 'post' },

    hashtags: [{ type: String, lowercase: true, trim: true, index: true }],
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    taggedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    location: { type: locationSchema, default: undefined },

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
    savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    sharedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    shares: { type: Number, default: 0 },
    views: { type: Number, default: 0 },

    isArchived: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },

    reports: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String, enum: ['spam', 'nudity', 'violence', 'hate_speech', 'misinformation', 'other'] },
        details: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isRemoved: { type: Boolean, default: false }, // moderation takedown

    hiddenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    notInterestedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

postSchema.pre('validate', function (next) {
  if (!this.location || (typeof this.location === 'object' && Object.keys(this.location).length === 0)) {
    this.location = undefined;
    return next();
  }

  if (this.location && this.location.coordinates && Array.isArray(this.location.coordinates)) {
    const [longitude, latitude] = this.location.coordinates;
    if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
      this.location = {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
        label: this.location.label || '',
      };
    } else {
      this.location = undefined;
    }
  }

  next();
});

postSchema.index({ location: '2dsphere' });
postSchema.index({ createdAt: -1 });
postSchema.index({ caption: 'text', hashtags: 'text' });

postSchema.virtual('likesCount').get(function () {
  return this.likes.length;
});
postSchema.virtual('commentsCount').get(function () {
  return this.comments.length;
});
postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Post', postSchema);
