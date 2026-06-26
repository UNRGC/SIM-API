const AppError = require('../utils/appError');

const validate = (schema, property = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[property]);

  if (!result.success) {
    return next(
      new AppError('Datos de entrada invalidos.', 400, 'VALIDATION_ERROR', result.error.flatten())
    );
  }

  req[property] = result.data;
  return next();
};

module.exports = validate;
