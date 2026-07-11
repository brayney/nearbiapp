/**
 * Seed script - creates sample accounts and posts so the app is
 * immediately explorable after setup.
 * Run with: npm run seed
 */
const { autoConfigure } = require('./autoConfig');
autoConfigure();

const connectDB = require('../config/db');
const User = require('../models/User');
const Post = require('../models/Post');

const SAMPLE_USERS = [
  { username: 'brayn', email: 'brayn@example.com', password: 'Password123', displayName: 'Brayn Builds', bio: 'Full-stack builder | Ormoc City', isVerified: true },
  { username: 'admin', email: 'admin@example.com', password: 'Password123', displayName: 'Admin', role: 'admin', isVerified: true },
  { username: 'maria_santos', email: 'maria@example.com', password: 'Password123', displayName: 'Maria Santos', bio: 'Photographer 📸' },
  { username: 'juan_delacruz', email: 'juan@example.com', password: 'Password123', displayName: 'Juan Dela Cruz', bio: 'Traveler ✈️' },
];

const SAMPLE_CAPTIONS = [
  'Beautiful sunset today! #sunset #photography',
  'Working on a new project, excited to share soon 🚀 #coding',
  'Best coffee in town ☕ #coffee #foodie',
  'Weekend vibes with friends @maria_santos #weekend',
];

async function seed() {
  await connectDB();
  console.log('🌱  Seeding database...');

  await User.deleteMany({ email: { $in: SAMPLE_USERS.map((u) => u.email) } });

  const createdUsers = [];
  for (const u of SAMPLE_USERS) {
    const user = await User.create({ ...u, isEmailVerified: true });
    createdUsers.push(user);
    console.log(`   ✔ Created user: ${user.username} (password: Password123)`);
  }

  // Make them follow each other
  const [brayn, admin, maria, juan] = createdUsers;
  brayn.following.push(maria._id, juan._id);
  maria.followers.push(brayn._id);
  juan.followers.push(brayn._id);
  brayn.followingCount = brayn.following.length;
  maria.followersCount = maria.followers.length;
  juan.followersCount = juan.followers.length;
  await Promise.all([brayn.save(), maria.save(), juan.save()]);

  for (let i = 0; i < SAMPLE_CAPTIONS.length; i++) {
    const author = createdUsers[i % createdUsers.length];
    await Post.create({
      author: author._id,
      caption: SAMPLE_CAPTIONS[i],
      hashtags: (SAMPLE_CAPTIONS[i].match(/#[\w]+/g) || []).map((h) => h.slice(1).toLowerCase()),
      media: [],
    });
    await User.findByIdAndUpdate(author._id, { $inc: { postsCount: 1 } });
  }
  console.log(`   ✔ Created ${SAMPLE_CAPTIONS.length} sample posts`);

  console.log('\n✅  Seeding complete. Sample login: username "brayn", password "Password123"\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
