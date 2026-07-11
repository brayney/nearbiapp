const assert = require('assert');
const { buildFollowNotification } = require('../utils/notifications');

const actor = { _id: '507f1f77bcf86cd799439011', username: 'alice' };
const recipient = { _id: '507f191e810c19729de860ea', username: 'bob' };

const notification = buildFollowNotification(actor, recipient);

assert.strictEqual(notification.type, 'follow');
assert.strictEqual(notification.recipient.toString(), recipient._id);
assert.strictEqual(notification.actor.toString(), actor._id);
assert.match(notification.message, /followed you/i);

console.log('follow notification payload ok');
