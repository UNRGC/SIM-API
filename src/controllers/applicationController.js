const applicationService = require('../services/applicationService');

const createApplication = async (req, res, next) => {
  try {
    const application = await applicationService.createApplication(req.body);
    res.status(201).json({ data: application });
  } catch (error) {
    next(error);
  }
};

const listApplications = async (req, res, next) => {
  try {
    const applications = await applicationService.listApplications(req.query);
    res.status(200).json({ data: applications });
  } catch (error) {
    next(error);
  }
};

const getApplication = async (req, res, next) => {
  try {
    const application = await applicationService.getApplication(req.params.applicationId);
    res.status(200).json({ data: application });
  } catch (error) {
    next(error);
  }
};

const updateApplication = async (req, res, next) => {
  try {
    const application = await applicationService.updateApplication(
      req.params.applicationId,
      req.body
    );
    res.status(200).json({ data: application });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createApplication,
  listApplications,
  getApplication,
  updateApplication,
};
