const customerRepository = require('../repositories/customerRepository');
const AppError = require('../utils/appError');

const createCustomer = (payload) => customerRepository.create(payload);

const listCustomers = (filters) => customerRepository.list(filters);

const getCustomer = async (customerId) => {
  const customer = await customerRepository.findById(null, customerId);

  if (!customer) {
    throw new AppError('Cliente no encontrado.', 404, 'CUSTOMER_NOT_FOUND');
  }

  return customer;
};

const updateCustomer = async (customerId, payload) => {
  await getCustomer(customerId);
  return customerRepository.update(customerId, payload);
};

module.exports = {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
};
