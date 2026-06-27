const customerService = require('../services/customerService');

const createCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer(req.body);
    res.status(201).json({ data: customer });
  } catch (error) {
    next(error);
  }
};

const listCustomers = async (req, res, next) => {
  try {
    const customers = await customerService.listCustomers(req.query);
    res.status(200).json({ data: customers });
  } catch (error) {
    next(error);
  }
};

const getCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomer(req.params.customerId);
    res.status(200).json({ data: customer });
  } catch (error) {
    next(error);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.updateCustomer(req.params.customerId, req.body);
    res.status(200).json({ data: customer });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
};
