const { z } = require('zod');
const { fiscalCustomerFields } = require('./customerSchemas');

const isoDate = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value));

const uuid = z.string().uuid();

const licenseStatus = z.enum(['active', 'suspended', 'revoked', 'expired']);

const createCustomerSchema = z.object(fiscalCustomerFields);

const serialNumber = z
  .string()
  .trim()
  .min(29)
  .max(29)
  .regex(/^[A-HJ-NP-Z2-9]{5}(-[A-HJ-NP-Z2-9]{5}){4}$/i, 'Formato de numero de serie invalido.');

const createLicenseSchema = z
  .object({
    applicationId: uuid,
    customerId: uuid.optional(),
    customer: createCustomerSchema.optional(),
    validFrom: isoDate.optional(),
    validUntil: isoDate,
    maxActivations: z.number().int().positive().max(100000).default(1),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => !data.validFrom || data.validUntil > data.validFrom, {
    message: 'validUntil debe ser posterior a validFrom.',
    path: ['validUntil'],
  })
  .refine((data) => Boolean(data.customerId) !== Boolean(data.customer), {
    message: 'Envia customerId o customer, pero no ambos.',
    path: ['customer'],
  });

const validateLicenseSchema = z.object({
  serialNumber,
  applicationId: uuid.optional(),
  customerId: uuid.optional(),
});

const listLicensesSchema = z.object({
  applicationId: uuid.optional(),
  customerId: uuid.optional(),
  status: licenseStatus.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

const licenseIdParamsSchema = z.object({
  licenseId: uuid,
});

const revokeLicenseSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

const renewLicenseSchema = z.object({
  validUntil: isoDate,
});

module.exports = {
  createLicenseSchema,
  validateLicenseSchema,
  listLicensesSchema,
  licenseIdParamsSchema,
  revokeLicenseSchema,
  renewLicenseSchema,
};
