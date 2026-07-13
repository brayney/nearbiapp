const Message = require('../models/Message');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { createNotification } = require('../utils/notifications');
const { normalizeUploadedFile } = require('../utils/upload');

const participantFields = 'username displayName profilePicture isOnline lastActive privacySettings followers following';
const followingFields = 'username displayName profilePicture isOnline lastActive note';

function canMessage(sender, recipient) {
  const policy = recipient.privacySettings?.whoCanMessage || 'everyone';
  return policy === 'everyone' || (policy === 'followers' && recipient.followers.some((id) => id.equals(sender._id)));
}

function connectionFor(user, participantId) {
  return (user.messageConnections || []).find((connection) => String(connection.user) === String(participantId));
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
    const settings = connectionFor(req.user, participant._id);
    const status = settings?.spam ? 'spam' : (message.receiver._id.equals(userId) ? message.status : 'inbox');

    if (!existing) {
      byParticipant.set(id, {
        id,
        participant,
        preview: message.text,
        unread: 0,
        updatedAt: message.createdAt,
        status,
        blocked: Boolean(settings?.blocked),
        nickname: settings?.nickname || '',
      });
    } else {
      if (message.createdAt > existing.updatedAt) {
        existing.updatedAt = message.createdAt;
        existing.preview = message.text;
      }
      // Sending a reply accepts a request, so an old incoming request must not
      // keep the whole thread trapped in the Requests folder.
      if (message.sender._id.equals(userId)) existing.status = settings?.spam ? 'spam' : 'inbox';
      else if (existing.status !== 'inbox' && existing.status !== 'spam' && status === 'request') {
        existing.status = 'request';
      }
      existing.blocked = Boolean(settings?.blocked);
      existing.nickname = settings?.nickname || '';
    }

    if (message.receiver._id.equals(userId) && !message.readAt) byParticipant.get(id).unread += 1;
  });

  const following = await User.find({ _id: { $in: req.user.following || [] } })
    .select(followingFields)
    .sort({ username: 1 });
  const now = new Date();
  const followingUsers = following.map((user) => ({
    id: String(user._id),
    username: user.username,
    displayName: user.displayName,
    profilePicture: user.profilePicture,
    isOnline: user.isOnline,
    note: user.note?.expiresAt && user.note.expiresAt > now ? user.note.text : '',
  }));

  res.status(200).json({ success: true, conversations: [...byParticipant.values()], following: followingUsers });
});

exports.getConversation = catchAsync(async (req, res, next) => {
  if (String(req.user._id) === req.params.userId) return next(new ApiError(400, 'You cannot start a conversation with yourself.'));
  const participant = await User.findById(req.params.userId).select(participantFields);
  if (!participant) return next(new ApiError(404, 'User not found.'));

  const filter = { $or: [{ sender: req.user._id, receiver: participant._id }, { sender: participant._id, receiver: req.user._id }] };
  const messages = await Message.find(filter).sort({ createdAt: 1 });
  const connection = connectionFor(req.user, participant._id);
  await Message.updateMany({ sender: participant._id, receiver: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  res.status(200).json({ success: true, participant, messages, connection: connection || {} });
});

exports.sendMessage = catchAsync(async (req, res, next) => {
  const text = req.body.text?.trim() || '';
  if (!text && !req.file) return next(new ApiError(400, 'Add a message or an image/video.'));
  if (text.length > 2000) return next(new ApiError(400, 'Messages cannot exceed 2,000 characters.'));
  if (String(req.user._id) === req.params.userId) return next(new ApiError(400, 'You cannot message yourself.'));

  const recipient = await User.findById(req.params.userId).select(participantFields);
  if (!recipient) return next(new ApiError(404, 'User not found.'));
  if (!canMessage(req.user, recipient)) return next(new ApiError(403, 'This user is not accepting messages from you.'));
  if (connectionFor(recipient, req.user._id)?.blocked) return next(new ApiError(403, 'This user has blocked you.'));

  const isRecipientFollowingSender = (recipient.following || []).some((id) => id.equals(req.user._id));
  const existingThread = await Message.exists({
    $or: [
      { sender: req.user._id, receiver: recipient._id },
      { sender: recipient._id, receiver: req.user._id },
    ],
  });
  const messageStatus = (isRecipientFollowingSender || existingThread) ? 'inbox' : 'request';
  if (existingThread) {
    await Message.updateMany({
      $or: [
        { sender: req.user._id, receiver: recipient._id },
        { sender: recipient._id, receiver: req.user._id },
      ],
      status: 'request',
    }, { $set: { status: 'inbox' } });
  }

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

exports.updateConnection = catchAsync(async (req, res, next) => {
  const participant = await User.findById(req.params.userId).select('_id');
  if (!participant) return next(new ApiError(404, 'User not found.'));
  if (String(participant._id) === String(req.user._id)) return next(new ApiError(400, 'You cannot update settings for yourself.'));

  let connection = connectionFor(req.user, participant._id);
  if (!connection) {
    req.user.messageConnections.push({ user: participant._id });
    connection = req.user.messageConnections[req.user.messageConnections.length - 1];
  }
  if (typeof req.body.nickname === 'string') connection.nickname = req.body.nickname.trim().slice(0, 50);
  if (typeof req.body.blocked === 'boolean') connection.blocked = req.body.blocked;
  if (typeof req.body.spam === 'boolean') connection.spam = req.body.spam;
  await req.user.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, connection });
});

exports.reportConversation = catchAsync(async (req, res, next) => {
  const participant = await User.findById(req.params.userId).select('_id username');
  if (!participant) return next(new ApiError(404, 'User not found.'));
  let connection = connectionFor(req.user, participant._id);
  if (!connection) {
    req.user.messageConnections.push({ user: participant._id, spam: true });
    connection = req.user.messageConnections[req.user.messageConnections.length - 1];
  } else {
    connection.spam = true;
  }
  await req.user.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, message: 'Conversation reported and moved to spam.', connection });
});

exports.markRead = catchAsync(async (req, res) => {
  await Message.updateMany({ sender: req.params.conversationId, receiver: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  res.status(200).json({ success: true });
});
