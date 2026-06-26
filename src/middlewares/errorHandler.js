const AppError = require('../utils/appError');

module.exports = (err, req, res, _next) => {
  const isKnownError = err instanceof AppError;
  const statusCode = isKnownError ? err.statusCode : 500;
  const code = isKnownError ? err.code : 'INTERNAL_ERROR';

  if (!isKnownError) {
    req.log.error({ err }, 'Unhandled error');
  }

  res.status(statusCode).json({
    error: {
      code,
      message: isKnownError ? err.message : 'Ocurrio un error inesperado.',
      details: isKnownError ? err.details : undefined,
    },
  });
};
