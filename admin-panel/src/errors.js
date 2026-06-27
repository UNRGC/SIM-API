class PanelError extends Error {
  constructor(message, statusCode = 500, code = 'PANEL_ERROR', details = undefined) {
    super(message);
    this.name = 'PanelError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

const notFound = (_req, _res, next) => {
  next(new PanelError('Recurso no encontrado.', 404, 'NOT_FOUND'));
};

const errorHandler = (err, req, res, _next) => {
  const isKnown = err instanceof PanelError;
  const statusCode = isKnown ? err.statusCode : 500;

  if (!isKnown) {
    req.log.error({ err }, 'Unhandled panel error');
  }

  res.status(statusCode).json({
    error: {
      code: isKnown ? err.code : 'INTERNAL_ERROR',
      message: isKnown ? err.message : 'Ocurrio un error inesperado.',
      details: isKnown ? err.details : undefined,
    },
  });
};

module.exports = {
  PanelError,
  notFound,
  errorHandler,
};
