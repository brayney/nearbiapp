const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, trim: true, maxlength: 2000, default: '' },
    media: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
      type: { type: String, enum: ['', 'image', 'video', 'gif'], default: '' },
    },
    status: { type: String, enum: ['inbox', 'request'], default: 'inbox' },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Every thread query uses these fields, so this keeps the inbox and history fast.
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
