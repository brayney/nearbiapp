const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, trim: true, maxlength: 280, default: '' },
    media: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
      type: { type: String, enum: ['', 'image', 'video', 'gif'], default: '' },
    },
    viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// MongoDB deletes expired stories automatically; the query also filters them immediately.
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Story', storySchema);
