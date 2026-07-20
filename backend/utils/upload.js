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

if (!usingCloudinary) {
  throw new Error(
    'Cloudinary is required for media uploads. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'social-app',
    resource_type: 'auto',
  },
});

const ALLOWED_MIME = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

function fileFilter(req, file, cb) {
  // MediaRecorder commonly appends codec information (for example,
  // `audio/webm;codecs=opus`). Multer preserves that value, so compare the
  // base MIME type instead of rejecting otherwise-valid voice recordings.
  const mimeType = file.mimetype.split(';', 1)[0].toLowerCase();
  const isImage = mimeType.startsWith('image/');
  const isVideo = mimeType.startsWith('video/');
  const isAudio = mimeType.startsWith('audio/');

  if (isImage || isVideo || isAudio || ALLOWED_MIME.includes(mimeType)) {
    return cb(null, true);
  }

  cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 250 * 1024 * 1024, files: 12 }, // 250MB per file, max 12 files
});

function normalizeUploadedFile(file) {
  const mimeType = file.mimetype.split(';', 1)[0].toLowerCase();
  return {
    url: file.path,
    publicId: file.filename,
    type: mimeType.startsWith('video')
      ? 'video'
      : mimeType.startsWith('audio')
      ? 'audio'
      : mimeType === 'image/gif'
      ? 'gif'
      : mimeType.startsWith('image')
      ? 'image'
      : 'file',
  };
}

module.exports = { upload, normalizeUploadedFile, usingCloudinary, cloudinary };
