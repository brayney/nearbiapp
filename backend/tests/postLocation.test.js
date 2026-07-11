const assert = require('assert');
const Post = require('../models/Post');

(async () => {
  const post = new Post({
    author: '66f000000000000000000001',
    caption: 'Hello',
    location: { label: 'Paris', coordinates: [2.3522, 48.8566] },
  });

  assert.deepStrictEqual(post.location.coordinates, [2.3522, 48.8566]);
  assert.strictEqual(post.location.label, 'Paris');
  console.log('post location schema ok');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
