const applicationRepository = require('../repositories/applicationRepository');
const AppError = require('../utils/appError');

const createApplication = (payload) => applicationRepository.create(payload);

const listApplications = (filters) => applicationRepository.list(filters);

const getApplication = async (applicationId) => {
  const application = await applicationRepository.findById(applicationId);

  if (!application) {
    throw new AppError('Aplicacion no encontrada.', 404, 'APPLICATION_NOT_FOUND');
  }

  return application;
};

const updateApplication = async (applicationId, payload) => {
  await getApplication(applicationId);
  return applicationRepository.update(applicationId, payload);
};

module.exports = {
  createApplication,
  listApplications,
  getApplication,
  updateApplication,
};
