const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const usingCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

let storage;

if (usingCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'social-app',
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'webm', 'mp3', 'wav', 'ogg'],
    },
  });
} else {
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });
}

const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
];

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
  cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 10 }, // 50MB per file, max 10 files
});

// Helper: builds a public URL/publicId pair depending on backing store,
// so controllers don't need to know which storage mode is active.
function normalizeUploadedFile(file) {
  if (usingCloudinary) {
    return {
      url: file.path,
      publicId: file.filename,
      type: file.mimetype.startsWith('video')
        ? 'video'
        : file.mimetype.startsWith('audio')
        ? 'audio'
        : file.mimetype === 'image/gif'
        ? 'gif'
        : 'image',
    };
  }
  return {
    url: `/uploads/${file.filename}`,
    publicId: '',
    type: file.mimetype.startsWith('video')
      ? 'video'
      : file.mimetype.startsWith('audio')
      ? 'audio'
      : file.mimetype === 'image/gif'
      ? 'gif'
      : 'image',
  };
}

module.exports = { upload, normalizeUploadedFile, usingCloudinary, cloudinary };
