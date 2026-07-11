const { autoConfigure } = require('./utils/autoConfig');
autoConfigure(); // must run before anything else touches process.env

const http = require('http');
const connectDB = require('./config/db');
const createApp = require('./app');

async function start() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`\n🚀  Server running on http://localhost:${PORT}`);
    console.log(`    Health check: http://localhost:${PORT}/api/health\n`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION:', err);
    server.close(() => process.exit(1));
  });
}

start();
