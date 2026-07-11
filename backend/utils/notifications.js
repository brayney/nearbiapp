function buildFollowNotification(actor, recipient) {
  return {
    type: 'follow',
    recipient: recipient._id,
    actor: actor._id,
    message: `${actor.username} followed you.`,
    read: false,
    createdAt: new Date(),
  };
}

function buildNotification({ type, actor, recipient, message, post }) {
  return {
    type,
    recipient: recipient._id,
    actor: actor._id,
    message,
    post,
    read: false,
    createdAt: new Date(),
  };
}

async function createNotification({ type, actor, recipient, message, post }) {
  if (!recipient || String(actor._id) === String(recipient._id)) return null;
  // Require lazily to avoid a circular dependency while User loads this utility.
  const User = require('../models/User');
  const notification = buildNotification({ type, actor, recipient, message, post });
  await User.findByIdAndUpdate(recipient._id, { $push: { notifications: notification } });
  return notification;
}

module.exports = { buildFollowNotification, buildNotification, createNotification };
