const ApiError = require('../utils/ApiError');

function handleCastError(err) {
  return new ApiError(400, `Invalid ${err.path}: ${err.value}`);
}

function handleDuplicateFieldError(err) {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new ApiError(409, `${field} '${value}' is already in use.`);
}

function handleValidationError(err) {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new ApiError(400, `Invalid input: ${messages.join('. ')}`);
}

function handleJWTError() {
  return new ApiError(401, 'Invalid token. Please log in again.');
}

function handleJWTExpired() {
  return new ApiError(401, 'Your session has expired. Please log in again.');
}

function errorHandler(err, req, res, next) {
  let error = err;
  error.statusCode = error.statusCode || 500;

  if (err.name === 'CastError') error = handleCastError(err);
  if (err.code === 11000) error = handleDuplicateFieldError(err);
  if (err.name === 'ValidationError') error = handleValidationError(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpired();
  if (err.name === 'MulterError') error = new ApiError(400, `Upload error: ${err.message}`);

  const isProd = process.env.NODE_ENV === 'production';

  if (!error.isOperational) {
    console.error('💥 UNEXPECTED ERROR:', err);
    return res.status(500).json({
      success: false,
      message: isProd ? 'Something went wrong.' : error.message,
      ...(isProd ? {} : { stack: err.stack }),
    });
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    errors: error.errors?.length ? error.errors : undefined,
  });
}

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
}

module.exports = { errorHandler, notFound };
