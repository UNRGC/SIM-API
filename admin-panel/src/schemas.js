const { z } = require('zod');

const uuid = z.string().uuid();
const optionalText = (max) => z.string().trim().max(max).optional();
const requiredText = (max) => z.string().trim().min(1).max(max);
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
const queryBoolean = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1')
  .optional();
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

const loginSchema = z.object({
  username: requiredText(120),
  password: z.string().min(1).max(200),
});

const listSchema = z.object({
  q: optionalText(200),
  isActive: queryBoolean,
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

const licenseListSchema = z.object({
  applicationId: uuid.optional(),
  customerId: uuid.optional(),
  status: z.enum(['active', 'suspended', 'revoked', 'expired']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

const applicationIdParamsSchema = z.object({
  applicationId: uuid,
});

const customerIdParamsSchema = z.object({
  customerId: uuid,
});

const licenseIdParamsSchema = z.object({
  licenseId: uuid,
});

const licenseActivationIdParamsSchema = z.object({
  licenseId: uuid,
  activationId: z.coerce.number().int().positive(),
});

const applicationCreateSchema = z.object({
  name: requiredText(150),
  code: requiredText(80).toUpperCase(),
  isActive: z.boolean().optional(),
});

const applicationUpdateSchema = z
  .object({
    name: requiredText(150).optional(),
    code: requiredText(80).toUpperCase().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar.',
  });

const customerFields = {
  externalRef: optionalText(120),
  name: requiredText(200),
  email: z.string().trim().email().max(320).optional(),
  rfc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/, 'Formato de RFC invalido.')
    .optional(),
  fiscalRegime: optionalText(120),
  postalCode: z.string().trim().regex(/^\d{5}$/, 'El CP debe tener 5 digitos.').optional(),
};

const customerCreateSchema = z.object({
  ...customerFields,
  isActive: z.boolean().optional(),
});

const customerUpdateSchema = z
  .object({
    externalRef: z.string().trim().min(1).max(120).nullable().optional(),
    name: requiredText(200).optional(),
    email: z.string().trim().email().max(320).nullable().optional(),
    rfc: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/, 'Formato de RFC invalido.')
      .nullable()
      .optional(),
    fiscalRegime: z.string().trim().min(1).max(120).nullable().optional(),
    postalCode: z.string().trim().regex(/^\d{5}$/, 'El CP debe tener 5 digitos.').nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar.',
  });

const serialNumber = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-HJ-NP-Z2-9]{5}(-[A-HJ-NP-Z2-9]{5}){4}$/, 'Formato de numero de serie invalido.');

const licenseCreateSchema = z
  .object({
    applicationId: uuid,
    customerId: uuid.optional(),
    customer: z.object(customerFields).optional(),
    validFrom: dateInput().optional(),
    validUntil: dateInput({ endOfDay: true }),
    maxActivations: z.number().int().positive().max(100000).default(1),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => Boolean(data.customerId) !== Boolean(data.customer), {
    message: 'Envia customerId o customer, pero no ambos.',
  });

const licenseRenewSchema = z.object({
  validUntil: dateInput({ endOfDay: true }),
});

const licenseCertificateSchema = z.object({
  serialNumber,
});

const licenseRevokeSchema = z.object({
  reason: optionalText(500),
});

const validate = (schema, property = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[property]);

  if (!result.success) {
    const { PanelError } = require('./errors');
    return next(
      new PanelError('Datos de entrada invalidos.', 400, 'VALIDATION_ERROR', result.error.flatten())
    );
  }

  req[property] = result.data;
  return next();
};

module.exports = {
  validate,
  loginSchema,
  listSchema,
  licenseListSchema,
  applicationIdParamsSchema,
  customerIdParamsSchema,
  licenseIdParamsSchema,
  licenseActivationIdParamsSchema,
  applicationCreateSchema,
  applicationUpdateSchema,
  customerCreateSchema,
  customerUpdateSchema,
  licenseCreateSchema,
  licenseRenewSchema,
  licenseRevokeSchema,
  licenseCertificateSchema,
};
