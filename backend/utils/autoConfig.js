/**
 * autoConfig.js
 * ---------------------------------------------------------
 * Guarantees the app can boot with ONLY MONGODB_URI supplied.
 * On first run it generates secure random secrets for anything
 * missing (JWT secrets, cookie secret) and persists them back
 * into backend/.env so they stay stable across restarts
 * (important - otherwise every restart would invalidate all
 * existing tokens/sessions).
 * ---------------------------------------------------------
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENV_PATH = path.join(__dirname, '..', '.env');

function generateSecret(bytes = 48) {
  return crypto.randomBytes(bytes).toString('hex');
}

function loadOrCreateEnvFile() {
  if (!fs.existsSync(ENV_PATH)) {
    // No .env yet - create a minimal one. MONGODB_URI must come from
    // a real environment variable (e.g. export MONGODB_URI=... or Docker secret).
    fs.writeFileSync(ENV_PATH, `MONGODB_URI=${process.env.MONGODB_URI || ''}\n`);
  }
  require('dotenv').config({ path: ENV_PATH });
}

function ensureGenerated(key, generator) {
  if (!process.env[key] || process.env[key].trim() === '') {
    const value = generator();
    process.env[key] = value;
    appendToEnvFile(key, value);
    return value;
  }
  return process.env[key];
}

function appendToEnvFile(key, value) {
  const content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  const line = `${key}=${value}`;
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    fs.writeFileSync(ENV_PATH, content.replace(regex, line));
  } else {
    fs.writeFileSync(ENV_PATH, content.trimEnd() + `\n${line}\n`);
  }
}

function autoConfigure() {
  loadOrCreateEnvFile();

  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.trim() === '') {
    console.error('\n❌  MONGODB_URI is missing.');
    console.error('    Set it in backend/.env or as an environment variable and restart.\n');
    process.exit(1);
  }

  ensureGenerated('JWT_ACCESS_SECRET', () => generateSecret(48));
  ensureGenerated('JWT_REFRESH_SECRET', () => generateSecret(48));
  ensureGenerated('COOKIE_SECRET', () => generateSecret(32));

  process.env.PORT = process.env.PORT || '5000';
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  process.env.JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
  process.env.JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';
  process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
  process.env.EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@socialapp.local';

  const usingCloudinary = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
  const usingSMTP = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

  console.log('✅  Auto-config complete');
  console.log(`    Storage: ${usingCloudinary ? 'Cloudinary' : 'Local disk (uploads/)'}`);
  console.log(`    Email:   ${usingSMTP ? 'SMTP' : 'Console logging (dev mode)'}`);

  return { usingCloudinary, usingSMTP };
}

module.exports = { autoConfigure };
