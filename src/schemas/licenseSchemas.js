const { z } = require('zod');
const { fiscalCustomerFields } = require('./customerSchemas');

const shortDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const isoDateTime = z.string().datetime({ offset: true });
const parseShortDate = (value, endOfDay) => {
  const match = shortDatePattern.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    )
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};
const dateInput = ({ endOfDay = false } = {}) =>
  z
    .string()
    .trim()
    .refine((value) => Boolean(parseShortDate(value, endOfDay)) || isoDateTime.safeParse(value).success, {
      message: 'Usa una fecha YYYY-MM-DD o una fecha ISO valida.',
    })
    .transform((value) => {
      return parseShortDate(value, endOfDay) || new Date(value);
    });

const uuid = z.string().uuid();

const licenseStatus = z.enum(['active', 'suspended', 'revoked', 'expired']);

const createCustomerSchema = z.object(fiscalCustomerFields);

const serialNumber = z
  .string()
  .trim()
  .min(29)
  .max(29)
  .regex(/^[A-HJ-NP-Z2-9]{5}(-[A-HJ-NP-Z2-9]{5}){4}$/i, 'Formato de numero de serie invalido.');

const deviceId = z
  .string()
  .trim()
  .min(8)
  .max(200)
  .regex(/^[A-Za-z0-9._:@-]+$/, 'Formato de identificador de equipo invalido.');

const deviceName = z.string().trim().min(1).max(120).optional();

const createLicenseSchema = z
  .object({
    applicationId: uuid,
    customerId: uuid.optional(),
    customer: createCustomerSchema.optional(),
    validFrom: dateInput().optional(),
    validUntil: dateInput({ endOfDay: true }),
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
  deviceId: deviceId.optional(),
  deviceName,
});

const deactivateLicenseSchema = z.object({
  serialNumber,
  applicationId: uuid.optional(),
  customerId: uuid.optional(),
  deviceId,
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

const licenseActivationIdParamsSchema = z.object({
  licenseId: uuid,
  activationId: z.coerce.number().int().positive(),
});

const revokeLicenseSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

const renewLicenseSchema = z.object({
  validUntil: dateInput({ endOfDay: true }),
});

module.exports = {
  createLicenseSchema,
  deactivateLicenseSchema,
  validateLicenseSchema,
  listLicensesSchema,
  licenseActivationIdParamsSchema,
  licenseIdParamsSchema,
  revokeLicenseSchema,
  renewLicenseSchema,
};
