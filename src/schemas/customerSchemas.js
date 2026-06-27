const { z } = require('zod');

const uuid = z.string().uuid();
const queryBoolean = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const fiscalCustomerFields = {
  externalRef: z.string().trim().min(1).max(120).optional(),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320).optional(),
  rfc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/, 'Formato de RFC invalido.')
    .optional(),
  fiscalRegime: z.string().trim().min(1).max(120).optional(),
  postalCode: z.string().trim().regex(/^\d{5}$/, 'El CP debe tener 5 digitos.').optional(),
};

const customerIdParamsSchema = z.object({
  customerId: uuid,
});

const createCustomerSchema = z.object({
  ...fiscalCustomerFields,
  isActive: z.boolean().optional().default(true),
});

const updateCustomerSchema = z
  .object({
    externalRef: z.string().trim().min(1).max(120).nullable().optional(),
    name: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().email().max(320).nullable().optional(),
    rfc: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/, 'Formato de RFC invalido.')
      .nullable()
      .optional(),
    fiscalRegime: z.string().trim().min(1).max(120).nullable().optional(),
    postalCode: z
      .string()
      .trim()
      .regex(/^\d{5}$/, 'El CP debe tener 5 digitos.')
      .nullable()
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar.',
  });

const listCustomersSchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  isActive: queryBoolean.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

module.exports = {
  customerIdParamsSchema,
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersSchema,
  fiscalCustomerFields,
};
