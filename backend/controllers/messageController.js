const Message = require('../models/Message');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { createNotification } = require('../utils/notifications');
const { normalizeUploadedFile } = require('../utils/upload');

const participantFields = 'username displayName profilePicture isOnline lastActive privacySettings followers';

function canMessage(sender, recipient) {
  const policy = recipient.privacySettings?.whoCanMessage || 'everyone';
  return policy === 'everyone' || (policy === 'followers' && recipient.followers.some((id) => id.equals(sender._id)));
}

exports.getConversations = catchAsync(async (req, res) => {
  const userId = req.user._id;
  const messages = await Message.find({ $or: [{ sender: userId }, { receiver: userId }] })
    .sort({ createdAt: -1 })
    .populate('sender receiver', participantFields);

  const byParticipant = new Map();
  messages.forEach((message) => {
    const participant = message.sender._id.equals(userId) ? message.receiver : message.sender;
    const id = String(participant._id);
    const existing = byParticipant.get(id);
    const status = message.receiver._id.equals(userId) ? message.status : 'inbox';

    if (!existing) {
      byParticipant.set(id, {
        id,
        participant,
        preview: message.text,
        unread: 0,
        updatedAt: message.createdAt,
        status,
      });
    } else {
      if (message.createdAt > existing.updatedAt) {
        existing.updatedAt = message.createdAt;
        existing.preview = message.text;
      }
      if (existing.status !== 'request' && status === 'request') {
        existing.status = 'request';
      }
    }

    if (message.receiver._id.equals(userId) && !message.readAt) byParticipant.get(id).unread += 1;
  });

  res.status(200).json({ success: true, conversations: [...byParticipant.values()] });
});

exports.getConversation = catchAsync(async (req, res, next) => {
  if (String(req.user._id) === req.params.userId) return next(new ApiError(400, 'You cannot start a conversation with yourself.'));
  const participant = await User.findById(req.params.userId).select(participantFields);
  if (!participant) return next(new ApiError(404, 'User not found.'));

  const filter = { $or: [{ sender: req.user._id, receiver: participant._id }, { sender: participant._id, receiver: req.user._id }] };
  const messages = await Message.find(filter).sort({ createdAt: 1 });
  await Message.updateMany({ sender: participant._id, receiver: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  res.status(200).json({ success: true, participant, messages });
});

exports.sendMessage = catchAsync(async (req, res, next) => {
  const text = req.body.text?.trim() || '';
  if (!text && !req.file) return next(new ApiError(400, 'Add a message or an image/video.'));
  if (text.length > 2000) return next(new ApiError(400, 'Messages cannot exceed 2,000 characters.'));
  if (String(req.user._id) === req.params.userId) return next(new ApiError(400, 'You cannot message yourself.'));

  const recipient = await User.findById(req.params.userId).select(participantFields);
  if (!recipient) return next(new ApiError(404, 'User not found.'));
  if (!canMessage(req.user, recipient)) return next(new ApiError(403, 'This user is not accepting messages from you.'));

  const isRecipientFollowingSender = recipient.following.some((id) => id.equals(req.user._id));
  const messageStatus = isRecipientFollowingSender ? 'inbox' : 'request';

  const uploaded = req.file ? normalizeUploadedFile(req.file) : null;
  const message = await Message.create({
    sender: req.user._id,
    receiver: recipient._id,
    text,
    status: messageStatus,
    media: uploaded ? { url: uploaded.url, publicId: uploaded.publicId, type: uploaded.type } : undefined,
  });
  await createNotification({ type: 'message', actor: req.user, recipient, message: `${req.user.username} sent you a message.` });
  res.status(201).json({ success: true, message });
});

exports.markRead = catchAsync(async (req, res) => {
  await Message.updateMany({ sender: req.params.conversationId, receiver: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  res.status(200).json({ success: true });
});
