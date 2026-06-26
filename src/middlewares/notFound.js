const AppError = require('../utils/appError');

module.exports = (req, _res, next) => {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
};
